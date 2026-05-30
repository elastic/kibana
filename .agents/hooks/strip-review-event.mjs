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
 * The flow is: split the command into pipeline segments, turn each segment into
 * an argv, drop any `env`/assignment prefix, then inspect `gh pr review` and
 * `gh api .../reviews` calls. Helpers below are ordered as they are used.
 *
 * @see .claude/hooks/strip-review-event.mjs for the Claude Code wrapper.
 * @see .cursor/hooks/strip-review-event.mjs for the Cursor wrapper.
 */

import { readFileSync, writeFileSync } from 'node:fs';

// --- Deny reasons -----------------------------------------------------------

/** Shared explanation of the sanctioned PENDING-then-submit flow. */
const PUBLISH_REASON =
  'Publishing a PR review immediately is blocked. Create the review in PENDING state by writing the request body to a JSON file (no `event` key) and running `gh api repos/{owner}/{repo}/pulls/{number}/reviews --input <file>`, then submit it explicitly with `gh api repos/{owner}/{repo}/pulls/{number}/reviews/{review_id}/events -f event=APPROVE`.';

const DENY_INLINE_BODY = `Passing a body via \`-f\`/\`-F\`/\`--field\`/\`--raw-field\` on the review-creation endpoint is not allowed: the value can be (or expand to) \`event=…\`, which publishes the review. Put the entire body in a JSON file (no \`event\` key) and pass it via \`--input <file>\`. ${PUBLISH_REASON}`;

const DENY_STDIN_INPUT = `\`--input -\` reads the body from stdin, which the hook cannot inspect or rewrite. Write the body to a file and pass \`--input <file>\`. ${PUBLISH_REASON}`;

const DENY_UNREADABLE_INPUT = `The hook cannot read or parse the \`--input\` file before \`gh\` runs, so it cannot strip a stray \`event\` key. Write a valid JSON payload file (no \`event\` key) at an absolute path in a separate, earlier command, then run \`gh api .../reviews --input <file>\`. ${PUBLISH_REASON}`;

// --- Matchers ---------------------------------------------------------------

/**
 * Review-creation endpoint: `/pulls/{n}/reviews` NOT followed by another
 * segment, so the submission endpoint `/reviews/{id}/events` is excluded. `{n}`
 * is `[^/]+` so a literal number and a variable (`pulls/$PR/reviews`) both match
 * — the PR number being in a variable does not change that it is the call.
 */
const REVIEW_CREATION_PATH = /pulls\/[^/]+\/reviews(?!\/)/;

/** `gh pr review` flags that publish immediately. */
const PR_REVIEW_PUBLISH_FLAGS = new Set(['--approve', '--request-changes', '--comment']);

/** `gh api` inline body flags: a value here can be (or expand to) `event=…`. */
const API_FIELD_FLAGS = new Set(['-f', '-F', '--field', '--raw-field']);

/** `gh api` flags that consume the following argv token as their value. */
const API_VALUE_FLAGS = new Set([
  '-f', '-F', '--field', '--raw-field', '-H', '--header', '-X', '--method',
  '--hostname', '-q', '--jq', '-t', '--template', '--input', '--cache',
]);

// --- Shell parsing (approximate; see header NON-GOALS) -----------------------

/**
 * Split a raw command into top-level pipeline segments at `;`, `|`, `&`, `&&`,
 * `||`, and newlines, ignoring separators inside quotes. Each segment is one
 * simple command we can inspect on its own.
 */
const splitSegments = (command) => {
  const segments = [];
  let segmentStart = 0;
  let openQuote = null;
  let index = 0;

  while (index < command.length) {
    const char = command[index];

    if (openQuote) {
      // A backslash inside double quotes escapes the next char, so skip both.
      if (char === '\\' && openQuote === '"' && index + 1 < command.length) {
        index += 2;
        continue;
      }
      if (char === openQuote) openQuote = null;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      openQuote = char;
      index += 1;
      continue;
    }

    const isLogical = command.startsWith('&&', index) || command.startsWith('||', index);
    const isPipeOrSemi =
      char === ';' || char === '|' || char === '\n' || (char === '&' && command[index + 1] !== '&');

    if (isLogical || isPipeOrSemi) {
      segments.push(command.slice(segmentStart, index));
      index += isLogical ? 2 : 1;
      segmentStart = index;
      continue;
    }

    index += 1;
  }

  segments.push(command.slice(segmentStart));
  return segments;
};

/**
 * Turn one segment into an approximate argv, resolving single quotes, double
 * quotes, and backslash escapes well enough that a quoted flag like `'-f'`
 * resolves to `-f`. Deliberately not a faithful shell: expansions are kept as
 * literal text, and inside double quotes a backslash is dropped before any
 * character (Bash only escapes before `$`, backtick, `"`, `\`, or newline), so
 * an exotic double-quoted path with a literal backslash can resolve differently
 * than Bash — an explicit non-goal, like other exotic quoting shapes.
 */
const tokenize = (segment) => {
  const args = [];
  let word = '';
  let inWord = false; // tracks empty quoted words like `""`
  let openQuote = null;
  let index = 0;

  const endWord = () => {
    if (inWord) args.push(word);
    word = '';
    inWord = false;
  };

  while (index < segment.length) {
    const char = segment[index];
    index += 1;

    if (openQuote === "'") {
      if (char === "'") openQuote = null;
      else word += char;
      continue;
    }

    if (openQuote === '"') {
      if (char === '\\' && index < segment.length) {
        word += segment[index];
        index += 1;
      } else if (char === '"') {
        openQuote = null;
      } else {
        word += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      openQuote = char;
      inWord = true;
    } else if (char === '\\' && index < segment.length) {
      word += segment[index];
      index += 1;
      inWord = true;
    } else if (char === ' ' || char === '\t' || char === '\n') {
      endWord();
    } else {
      word += char;
      inWord = true;
    }
  }

  endWord();
  return args;
};

/**
 * Drop a leading `env` and any `NAME=value` assignment prefixes (e.g. the
 * skill-recommended `GH_PAGER=cat gh …`) so we see the real command. `env`
 * *flag* tricks (`env --split-string …`) are a documented non-goal.
 */
const stripCommandPrefix = (args) => {
  let start = 0;
  if (args[start] === 'env') start += 1;
  while (start < args.length && /^\w+=/.test(args[start])) start += 1;
  return args.slice(start);
};

// --- gh argv inspection ------------------------------------------------------

/**
 * Find the positional endpoint argument of a `gh api` call (argv is
 * `['gh', 'api', …]`), skipping flags and the values they consume. We match the
 * review path against this token only — not the whole command — so a review
 * path inside a flag value (e.g. `-f body='…pulls/1/reviews…'`) is never
 * mistaken for the call. Returns the endpoint token, or `null` if there is none.
 */
const findApiEndpoint = (args) => {
  let index = 2; // skip 'gh', 'api'
  while (index < args.length) {
    const arg = args[index];
    if (arg === '--') {
      index += 1; // everything after `--` is positional
      break;
    }
    if (!arg.startsWith('-')) break; // first non-flag token is the endpoint
    const consumesValue = !arg.includes('=') && API_VALUE_FLAGS.has(arg);
    index += consumesValue ? 2 : 1;
  }
  return args[index] ?? null;
};

/** Resolve the `--input <file>` / `--input=<file>` value, or `null` if absent. */
const findInputValue = (args) => {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--input') return args[index + 1] ?? null;
    if (arg.startsWith('--input=')) return arg.slice('--input='.length);
  }
  return null;
};

/** True if any argv token is an inline body flag (`-f`/`-F`/`--field`/…). */
const hasInlineBodyFlag = (args) =>
  args.some((arg) => API_FIELD_FLAGS.has(arg) || /^-[fF]/.test(arg) || /^--(raw-)?field=/.test(arg));

/**
 * True if a `gh pr review` argv carries a publish flag. Tolerates the
 * `--approve=true` / `-a=1` form (strip `=value`) and bundled short flags like
 * `-ac` (publish if any of `a`/`r`/`c` is present).
 */
const isPublishingPrReview = (args) =>
  args.slice(3).some((arg) => {
    const flag = arg.split('=', 1)[0];
    if (PR_REVIEW_PUBLISH_FLAGS.has(flag)) return true;
    const isBundledShortFlags = /^-[a-zA-Z]+$/.test(flag);
    return isBundledShortFlags && /[arc]/.test(flag.slice(1));
  });

/**
 * Strip a stray top-level `event` key from the `--input` JSON file on disk
 * before `gh` runs. Returns `null` on success, or a deny reason if the file
 * cannot be read, parsed, or rewritten (fail closed: we cannot vouch for it).
 */
const stripStrayEventKey = (filePath) => {
  try {
    const payload = JSON.parse(readFileSync(filePath, 'utf-8'));
    const isPlainObject =
      payload !== null && typeof payload === 'object' && !Array.isArray(payload);
    if (isPlainObject && 'event' in payload) {
      delete payload.event;
      writeFileSync(filePath, JSON.stringify(payload, null, 2));
    }
    return null;
  } catch {
    return DENY_UNREADABLE_INPUT;
  }
};

/**
 * Inspect a `gh api` argv. Returns a deny reason for a publishing
 * review-creation call, or `null` if it is not review creation or is the
 * sanctioned `--input <file>` shape (whose file is sanitized as a side effect).
 */
const analyzeApiCall = (args) => {
  const endpoint = findApiEndpoint(args);
  if (endpoint === null || !REVIEW_CREATION_PATH.test(endpoint)) return null;

  if (hasInlineBodyFlag(args)) return DENY_INLINE_BODY;

  const inputValue = findInputValue(args);
  if (inputValue === '-') return DENY_STDIN_INPUT;
  if (inputValue === null) return null; // no body at all: cannot publish

  return stripStrayEventKey(inputValue);
};

// --- Entry point -------------------------------------------------------------

/**
 * Analyse a raw shell command. Returns `null` (allow, possibly after stripping a
 * stray `event` key from an `--input` file) or `{ deny: <reason> }`.
 */
export const analyzeReviewCommand = (rawCommand) => {
  if (typeof rawCommand !== 'string' || rawCommand === '') return null;
  const command = rawCommand.replace(/\\\n/g, ''); // join bash line continuations

  for (const segment of splitSegments(command)) {
    const args = stripCommandPrefix(tokenize(segment));
    const [program, subcommand] = args;
    if (program !== 'gh') continue;

    if (subcommand === 'pr' && args[2] === 'review') {
      if (isPublishingPrReview(args)) return { deny: PUBLISH_REASON };
      continue;
    }

    if (subcommand === 'api') {
      const denyReason = analyzeApiCall(args);
      if (denyReason) return { deny: denyReason };
    }
  }

  return null;
};
