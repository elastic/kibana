/**
 * Shared analyzer behind the `strip-review-event` hook for both Claude Code
 * and Cursor. Keeps PR review *creation* in PENDING state so a review is never
 * published without an explicit, separate submission step.
 *
 * Design: allowlist, not blocklist.
 *
 * Earlier versions tried to enumerate every dangerous shape with regexes
 * (`-f event=`, `$'event='`, `env` prefixes, process substitution, …). That is
 * an unwinnable game: the shell has unbounded ways to spell the same call, so
 * every new quoting/expansion trick was another bypass. Instead this analyzer
 * tokenises each pipeline segment into an approximate `argv` (resolving quotes
 * and backslash escapes the way the shell would) and then allows ONLY the one
 * sanctioned review-creation shape, denying everything else on that surface.
 *
 * The blessed review-creation shape (everything else on the surface denies):
 *
 *   gh api <repos/.../pulls/{n}/reviews> --input <plain-absolute-file>
 *     [ -X POST | --method POST | -H ... | --hostname ... | --jq ... | -q ... ]
 *
 * The named `--input` file is read here (before `gh` runs) and any stray
 * top-level `event` key is stripped on disk via a real JSON parser.
 *
 * Always denied (these publish immediately and have no sanctioned shape):
 *   - gh pr review --approve | --request-changes | --comment (and -a/-r/-c)
 *   - gh api graphql ... addPullRequestReview ...  (REST is the only blessed
 *     review path; the mutation can publish via an `event` argument)
 *   - any review-creation segment that is not exactly the blessed shape:
 *     a field flag (`-f`/`-F`/`--field`/`--raw-field`, in any quoting), stdin
 *     (`--input -`), an unreadable/non-JSON `--input` file, a heredoc, or any
 *     shell expansion (`$…`, `` `…` ``) the hook cannot evaluate.
 *
 * Known limitations (residual risk covered by skill + warn-github-mcp +
 * human-in-the-loop; this hook is best-effort against a cooperative agent, not
 * a security boundary against an adversary):
 *   - Nested shell evaluation (`bash -c '…'`, `eval …`) is not introspected;
 *     the Claude matcher (`Bash(gh *)`) does not even spawn the hook for these.
 *   - A GraphQL `addPullRequestReview` mutation whose name only appears after a
 *     shell expansion, or in an `--input` file created later in the same
 *     command, is not caught.
 *
 * @see .claude/hooks/strip-review-event.mjs for the Claude Code wrapper.
 * @see .cursor/hooks/strip-review-event.mjs for the Cursor wrapper.
 */

import { readFileSync, writeFileSync } from 'node:fs';

/** Review-creation endpoint path: `/pulls/{n}/reviews` not followed by `/…`. */
const reviewCreationPath = /pulls\/\d+\/reviews(?!\/)/;

/**
 * Review-creation path whose `{n}` is a shell expansion rather than a literal
 * number, e.g. `pulls/$PR/reviews`, `pulls/${PR}/reviews`,
 * `pulls/$(printf 1)/reviews`, `` pulls/`id`/reviews ``. The agent commonly
 * stores the PR number in a variable, so this must still be recognised as a
 * review-creation call — otherwise `reviewCreationPath` (numeric only) misses
 * it and the segment is never gated, slipping past the `hadExpansion`
 * fail-closed check. The id segment is "anything up to the next `/` that
 * contains a `$` or backtick".
 */
const reviewCreationPathExpanded = /pulls\/[^/]*[$`][^/]*\/reviews(?!\/)/;

/** Field-flag tokens (resolved argv): supplying a body inline instead of `--input`. */
const FIELD_FLAGS = new Set(['-f', '-F', '--field', '--raw-field']);

/** `gh pr review` flags that publish immediately. */
const PR_REVIEW_PUBLISH_LONG = new Set(['--approve', '--request-changes', '--comment']);

/**
 * Tokenise a shell segment into an approximate `argv`, resolving single
 * quotes, double quotes, and backslash escapes the way bash word-splitting
 * would — so a quoted flag like `'-f'` resolves to the token `-f`. Expansions
 * (`$VAR`, `$(…)`, backticks) are NOT evaluated; instead any unquoted or
 * double-quoted `$`/`` ` `` sets `hadExpansion`, letting callers fail closed
 * when a token's real value is opaque. Returns `{ argv, hadExpansion }`.
 */
const tokenize = (segment) => {
  const argv = [];
  let cur = '';
  let started = false;
  let quote = null;
  let hadExpansion = false;
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
      continue;
    }
    if (quote === '"') {
      if (c === '\\' && i + 1 < segment.length) {
        // Inside double quotes a backslash escapes `$` and `` ` ``, making them
        // literal — so an escaped one does NOT count as an expansion.
        cur += segment[i + 1];
        i += 2;
        continue;
      }
      if (c === '"') {
        quote = null;
        i += 1;
        continue;
      }
      if (c === '$' || c === '`') hadExpansion = true;
      cur += c;
      i += 1;
      continue;
    }
    // unquoted
    if (c === "'" || c === '"') {
      quote = c;
      started = true;
      i += 1;
      continue;
    }
    if (c === '\\' && i + 1 < segment.length) {
      cur += segment[i + 1];
      started = true;
      i += 2;
      continue;
    }
    if (c === '$' || c === '`') {
      hadExpansion = true;
      cur += c;
      started = true;
      i += 1;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\n') {
      push();
      i += 1;
      continue;
    }
    cur += c;
    started = true;
    i += 1;
  }
  push();
  return { argv, hadExpansion };
};

/**
 * Drop a leading `env [flags] [NAME=value …]` command prefix and any
 * `NAME=value` assignment prefixes, returning the argv of the actual command.
 * `env` execs the trailing command, and assignments precede it, so neither
 * changes what runs. `env` flags `-C/-P/-S/-u` take a following argument.
 */
const stripCommandPrefix = (argv) => {
  let i = 0;
  if (argv[i] === 'env') {
    i += 1;
    while (i < argv.length) {
      const t = argv[i];
      if (t === '-C' || t === '-P' || t === '-S' || t === '-u') {
        i += 2;
        continue;
      }
      if (t.startsWith('-')) {
        i += 1;
        continue;
      }
      break;
    }
  }
  while (i < argv.length && /^\w+=/.test(argv[i])) i += 1;
  return argv.slice(i);
};

/** Walks `src` tracking quote state; returns top-level pipeline segment strings. */
const splitSegments = (src) => {
  const segments = [];
  let i = 0;
  let quote = null;
  let start = 0;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      if (c === '\\' && quote === '"' && i + 1 < src.length) {
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      i += 1;
      continue;
    }
    const two = src.slice(i, i + 2);
    const sep2 = two === '&&' || two === '||';
    const sep1 =
      c === ';' || c === '|' || c === '\n' || (c === '&' && src[i + 1] !== '&');
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

/** Heredoc opener anywhere in the raw command: `<<EOF`, `<<-EOF`, `<<'EOF'`, `<<\EOF`. */
const heredoc = /<<-?\s*['"\\]?\w/;

const PUBLISH_REASON =
  'Publishing a PR review immediately is blocked. Create the review in PENDING state by writing the request body to a JSON file (no `event` key) and running `gh api repos/{owner}/{repo}/pulls/{number}/reviews --input <file>`, then submit it explicitly with `gh api repos/{owner}/{repo}/pulls/{number}/reviews/{review_id}/events -f event=APPROVE`.';

const findInputValue = (argv) => {
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === '--input') return i + 1 < argv.length ? argv[i + 1] : null;
    if (t.startsWith('--input=')) return t.slice('--input='.length);
  }
  return null;
};

/**
 * Validate (and sanitise in place) the blessed REST review-creation shape.
 * `argv` is the command argv with the `env`/assignment prefix already removed
 * and `argv[0..1] === ['gh','api']`. Returns `{ deny }` or `null` (allow).
 */
const analyzeRestCreation = (argv, hadExpansion) => {
  if (hadExpansion) {
    return {
      deny: `The review-creation command contains a shell expansion (\`$…\` or backticks) the hook cannot evaluate, so it cannot verify the request body. Use a fully-resolved, absolute path and no expansions. ${PUBLISH_REASON}`,
    };
  }
  // Only --input may provide the body. Any field flag (in any quoting form,
  // already unquoted by the tokenizer) is rejected fail-closed.
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
  if (inputValue === null) return null; // no body at all: cannot publish
  try {
    const payload = JSON.parse(readFileSync(inputValue, 'utf-8'));
    if (
      payload !== null &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      'event' in payload
    ) {
      delete payload.event;
      writeFileSync(inputValue, JSON.stringify(payload, null, 2));
    }
  } catch {
    return {
      deny: `The hook cannot read or parse the \`--input\` file before \`gh\` runs, so it cannot strip a stray \`event\` key. Write a valid JSON payload file (no \`event\` key) at an absolute path in a separate, earlier command, then run \`gh api .../reviews --input <file>\`. ${PUBLISH_REASON}`,
    };
  }
  return null;
};

/**
 * Deny a GraphQL `addPullRequestReview` mutation. The mutation name may sit in
 * the command string or in an `--input` file (read here when present and
 * readable). Other GraphQL (e.g. `addSubIssue`) is unaffected.
 */
const analyzeGraphql = (argv) => {
  const mentions = (s) => typeof s === 'string' && s.includes('addPullRequestReview');
  if (argv.some(mentions)) {
    return {
      deny: `The GraphQL \`addPullRequestReview\` mutation creates and can immediately publish a review (via an \`event\` argument). Create the review through the REST endpoint instead. ${PUBLISH_REASON}`,
    };
  }
  const inputValue = findInputValue(argv);
  if (inputValue && inputValue !== '-') {
    try {
      if (mentions(readFileSync(inputValue, 'utf-8'))) {
        return {
          deny: `The GraphQL \`--input\` file contains an \`addPullRequestReview\` mutation, which can publish a review. Create the review through the REST endpoint instead. ${PUBLISH_REASON}`,
        };
      }
    } catch {
      // Unreadable file: GraphQL is a general-purpose path (e.g. addSubIssue),
      // so do not fail closed here. Residual gap documented above.
    }
  }
  return null;
};

const isGh = (argv, sub) =>
  argv[0] === 'gh' && sub.every((tok, idx) => argv[idx + 1] === tok);

/**
 * Analyse a raw shell command. Returns `null` (allow, possibly after stripping
 * a stray `event` key from an `--input` file) or `{ deny: <reason> }`.
 */
export const analyzeReviewCommand = (raw) => {
  if (typeof raw !== 'string' || raw === '') return null;

  // Bash removes `\<newline>` entirely (line continuation), so do the same
  // before splitting; otherwise a continued command splits into bogus segments.
  const cmd = raw.replace(/\\\n/g, '');
  const hasHeredoc = heredoc.test(cmd);

  for (const segment of splitSegments(cmd)) {
    const { argv: rawArgv, hadExpansion } = tokenize(segment);
    const argv = stripCommandPrefix(rawArgv);
    if (argv[0] !== 'gh') continue;

    if (isGh(argv, ['pr', 'review'])) {
      // cobra/pflag accept the `--flag=value` boolean form (`--approve=true`,
      // `-a=1`), which publishes the same as the bare flag. Strip the `=value`
      // suffix before matching so both shapes are caught.
      const publishes = argv.slice(3).some((t) => {
        const name = t.split('=', 1)[0];
        return (
          PR_REVIEW_PUBLISH_LONG.has(name) ||
          (/^-[a-zA-Z]+$/.test(name) && /[arc]/.test(name.slice(1)))
        );
      });
      if (publishes) return { deny: PUBLISH_REASON };
      continue;
    }

    if (isGh(argv, ['api', 'graphql'])) {
      const result = analyzeGraphql(argv);
      if (result) return result;
      continue;
    }

    if (isGh(argv, ['api'])) {
      // An expanded PR id (`pulls/$PR/reviews`) is matched against the raw
      // segment, not argv: a `$(… …)` id contains spaces that the tokenizer
      // would split. Such a path is review creation but its real value is
      // opaque, so fail closed immediately.
      if (reviewCreationPathExpanded.test(segment)) {
        return {
          deny: `The review-creation endpoint path contains a shell expansion (\`pulls/$VAR/reviews\` etc.) the hook cannot evaluate, so it cannot verify the request body. Use a literal PR number. ${PUBLISH_REASON}`,
        };
      }
      if (argv.some((t) => reviewCreationPath.test(t))) {
        if (hasHeredoc) {
          return {
            deny: `The review-creation command appears with a heredoc, which the hook cannot separate from the real call. Write the JSON payload file in a separate command, then run \`gh api .../reviews --input <file>\`. ${PUBLISH_REASON}`,
          };
        }
        const result = analyzeRestCreation(argv, hadExpansion);
        if (result) return result;
      }
    }
  }

  return null;
};
