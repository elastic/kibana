/**
 * Shared analyzer behind the `strip-review-event` hook (Claude Code + Cursor).
 * Keeps PR review *creation* in PENDING so a review is never published without
 * an explicit, separate submission step.
 *
 * BEST-EFFORT and intentionally minimal. It catches the *accidental* publish a
 * cooperating agent would actually type — nothing more. It is deny-only and
 * fails OPEN, so anything it misses is a no-op (never worse than having no hook)
 * and it can never block unrelated work or cause a bad action. The real backstop
 * is the kbn-github skill plus the AGENTS.md human-in-the-loop publication gate.
 *
 * Denied (the common-case slips):
 *   - gh pr review --approve | --request-changes | --comment  (and -a/-r/-c, and
 *     the `--approve=true` form), with an optional `env`/`NAME=value` prefix.
 *   - gh api <…/pulls/{n}/reviews> with an inline body flag (-f/-F/--field/
 *     --raw-field, which can carry `event=…`), `--input -` (stdin), or an
 *     `--input <file>` the hook cannot read/parse.
 *
 * Allowed:
 *   - gh api <…/pulls/{n}/reviews> --input <file>: the file is read here and any
 *     top-level `event` key is stripped on disk before `gh` runs.
 *   - the submission endpoint (…/reviews/{id}/events) and everything else.
 *
 * Explicit NON-GOALS (won't-fix; shell evasion is unbounded — see PR #261065):
 *   wrapper eval (`bash -c`, `eval`), a publish hidden in a command substitution
 *   (`id=$(gh pr review --approve 1)`), the GraphQL `addPullRequestReview`
 *   mutation, an endpoint/body supplied entirely by a variable, and `env` flag
 *   tricks (`env --split-string …`). These pass through; do not chase them.
 *
 * @see .claude/hooks/strip-review-event.mjs for the Claude Code wrapper.
 * @see .cursor/hooks/strip-review-event.mjs for the Cursor wrapper.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const PUBLISH_REASON =
  'Publishing a PR review immediately is blocked. Create the review in PENDING state by writing the request body to a JSON file (no `event` key) and running `gh api repos/{owner}/{repo}/pulls/{number}/reviews --input <file>`, then submit it explicitly with `gh api repos/{owner}/{repo}/pulls/{number}/reviews/{review_id}/events -f event=APPROVE`.';

/**
 * Review-creation endpoint: `/pulls/{n}/reviews` NOT followed by another
 * segment, so the submission endpoint `/reviews/{id}/events` is excluded. `{n}`
 * is `[^/]+` so a literal number and a variable (`pulls/$PR/reviews`) both match
 * — the PR number being in a variable does not change that it is the call.
 */
const reviewCreationPath = /pulls\/[^/]+\/reviews(?!\/)/;

/** Inline body flags: a value here can be (or expand to) `event=…`. */
const FIELD_FLAGS = new Set(['-f', '-F', '--field', '--raw-field']);

/** `gh api` flags that consume the following token as their value. */
const GH_API_VALUE_FLAGS = new Set([
  '-f', '-F', '--field', '--raw-field', '-H', '--header', '-X', '--method',
  '--hostname', '-q', '--jq', '-t', '--template', '--input', '--cache',
]);

/** `gh pr review` flags that publish immediately. */
const PR_REVIEW_PUBLISH = new Set(['--approve', '--request-changes', '--comment']);

/**
 * Tokenise a shell segment into an approximate `argv`, resolving single quotes,
 * double quotes, and backslash escapes the way bash word-splitting would — so a
 * quoted flag like `'-f'` resolves to the token `-f`. Expansions are left as
 * literal text (not evaluated): catching a publish hidden in an expansion is an
 * explicit non-goal.
 */
const tokenize = (segment) => {
  const argv = [];
  let cur = '';
  let started = false;
  let quote = null;
  let i = 0;
  const push = () => {
    if (started) argv.push(cur);
    cur = '';
    started = false;
  };
  while (i < segment.length) {
    const c = segment[i];
    if (quote === "'") {
      if (c === "'") quote = null;
      else cur += c;
      i += 1;
    } else if (quote === '"') {
      if (c === '\\' && i + 1 < segment.length) {
        cur += segment[i + 1];
        i += 2;
      } else if (c === '"') {
        quote = null;
        i += 1;
      } else {
        cur += c;
        i += 1;
      }
    } else if (c === "'" || c === '"') {
      quote = c;
      started = true;
      i += 1;
    } else if (c === '\\' && i + 1 < segment.length) {
      cur += segment[i + 1];
      started = true;
      i += 2;
    } else if (c === ' ' || c === '\t' || c === '\n') {
      push();
      i += 1;
    } else {
      cur += c;
      started = true;
      i += 1;
    }
  }
  push();
  return argv;
};

/**
 * Drop a leading `env` and any `NAME=value` assignment prefixes (e.g. the
 * skill-recommended `GH_PAGER=cat gh …`), returning the argv of the real
 * command. `env` *flag* tricks (`env --split-string …`) are a documented
 * non-goal and are intentionally not handled.
 */
const stripCommandPrefix = (argv) => {
  let i = 0;
  if (argv[i] === 'env') i += 1;
  while (i < argv.length && /^\w+=/.test(argv[i])) i += 1;
  return argv.slice(i);
};

/** Split a raw command into top-level pipeline segments, respecting quotes. */
const splitSegments = (src) => {
  const segments = [];
  let i = 0;
  let quote = null;
  let start = 0;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      if (c === '\\' && quote === '"' && i + 1 < src.length) i += 2;
      else {
        if (c === quote) quote = null;
        i += 1;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      i += 1;
      continue;
    }
    const two = src.slice(i, i + 2);
    const sep2 = two === '&&' || two === '||';
    const sep1 = c === ';' || c === '|' || c === '\n' || (c === '&' && src[i + 1] !== '&');
    if (sep2 || sep1) {
      segments.push(src.slice(start, i));
      i += sep2 ? 2 : 1;
      start = i;
      continue;
    }
    i += 1;
  }
  segments.push(src.slice(start));
  return segments;
};

/**
 * Find the positional endpoint argument of a `gh api` call (`argv[0..1] ===
 * ['gh','api']`), skipping flags and their values. Checking the review path
 * against this token only — not the whole command — means a review path inside
 * a flag value (e.g. `-f body='…pulls/1/reviews…'`) is never mistaken for the
 * call. Returns the endpoint token or `null`.
 */
const findApiEndpoint = (argv) => {
  let i = 2;
  while (i < argv.length) {
    const t = argv[i];
    if (t === '--') {
      i += 1;
      break;
    }
    if (t.startsWith('-')) {
      if (!t.includes('=') && GH_API_VALUE_FLAGS.has(t)) i += 1;
      i += 1;
      continue;
    }
    break;
  }
  return i < argv.length ? argv[i] : null;
};

/** Resolve the `--input <file>` / `--input=<file>` value, or `null`. */
const findInputValue = (argv) => {
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === '--input') return i + 1 < argv.length ? argv[i + 1] : null;
    if (t.startsWith('--input=')) return t.slice('--input='.length);
  }
  return null;
};

/**
 * Analyse a raw shell command. Returns `null` (allow, possibly after stripping a
 * stray `event` key from an `--input` file) or `{ deny: <reason> }`.
 */
export const analyzeReviewCommand = (raw) => {
  if (typeof raw !== 'string' || raw === '') return null;
  const cmd = raw.replace(/\\\n/g, ''); // bash line continuations

  for (const segment of splitSegments(cmd)) {
    const argv = stripCommandPrefix(tokenize(segment));
    if (argv[0] !== 'gh') continue;

    if (argv[1] === 'pr' && argv[2] === 'review') {
      // pflag accepts the `--flag=value` boolean form (`--approve=true`, `-a=1`)
      // which publishes the same as the bare flag, so strip `=value` first.
      const publishes = argv.slice(3).some((t) => {
        const name = t.split('=', 1)[0];
        return (
          PR_REVIEW_PUBLISH.has(name) ||
          (/^-[a-zA-Z]+$/.test(name) && /[arc]/.test(name.slice(1)))
        );
      });
      if (publishes) return { deny: PUBLISH_REASON };
      continue;
    }

    if (argv[1] === 'api') {
      const endpoint = findApiEndpoint(argv);
      if (endpoint == null || !reviewCreationPath.test(endpoint)) continue;

      if (argv.some((t) => FIELD_FLAGS.has(t) || /^-[fF]/.test(t) || /^--(raw-)?field=/.test(t))) {
        return {
          deny: `Passing a body via \`-f\`/\`-F\`/\`--field\`/\`--raw-field\` on the review-creation endpoint is not allowed: the value can be (or expand to) \`event=…\`, which publishes the review. Put the entire body in a JSON file (no \`event\` key) and pass it via \`--input <file>\`. ${PUBLISH_REASON}`,
        };
      }

      const inputValue = findInputValue(argv);
      if (inputValue === '-') {
        return {
          deny: `\`--input -\` reads the body from stdin, which the hook cannot inspect or rewrite. Write the body to a file and pass \`--input <file>\`. ${PUBLISH_REASON}`,
        };
      }
      if (inputValue === null) continue; // no body at all: cannot publish
      try {
        const payload = JSON.parse(readFileSync(inputValue, 'utf-8'));
        if (payload !== null && typeof payload === 'object' && !Array.isArray(payload) && 'event' in payload) {
          delete payload.event;
          writeFileSync(inputValue, JSON.stringify(payload, null, 2));
        }
      } catch {
        return {
          deny: `The hook cannot read or parse the \`--input\` file before \`gh\` runs, so it cannot strip a stray \`event\` key. Write a valid JSON payload file (no \`event\` key) at an absolute path in a separate, earlier command, then run \`gh api .../reviews --input <file>\`. ${PUBLISH_REASON}`,
        };
      }
    }
  }

  return null;
};
