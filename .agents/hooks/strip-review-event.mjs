/**
 * Shared analyzer behind the `strip-review-event` hook for both Claude Code
 * and Cursor. Keeps PR review *creation* in PENDING state so a review is never
 * published without an explicit, separate submission step.
 *
 * Status: BEST-EFFORT and intentionally FROZEN. This hook guards against the
 * *accidental* publish by a cooperating agent — the common-case slip. It is NOT
 * a security boundary. The shell has unbounded ways to spell the same call, so
 * novel evasion shapes (wrapper `eval`/`bash -c`, an endpoint or mutation name
 * hidden in a variable, exotic `env`/quoting tricks, …) will always exist; those
 * are a documented NON-GOAL and are won't-fix. The real backstop is the
 * kbn-github skill plus the AGENTS.md human-in-the-loop publication gate.
 * Crucially the hook is deny-only and fails OPEN: a bug or an uncaught bypass
 * only disables protection — it can never block unrelated work or cause a bad
 * action — so a missed evasion is a no-op, never a regression versus no hook.
 * Do not chase new evasion shapes; point at this note and resolve.
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
 * Command substitutions (`id=$(gh pr review --approve 1)`, `` `gh api …` ``)
 * ARE introspected: each substitution body is re-analysed with the same rules,
 * so a publish captured into a variable is still caught (and a legitimate
 * `id=$(gh api .../reviews --input <file>)` capture still works and is
 * sanitised).
 *
 * Known limitations (residual risk covered by skill + warn-github-mcp +
 * human-in-the-loop; this hook is best-effort against a cooperative agent, not
 * a security boundary against an adversary):
 *   - Nested shell evaluation via a wrapper command (`bash -c '…'`, `eval …`)
 *     is not introspected; the Claude matcher (`Bash(gh *)`) does not even
 *     spawn the hook for these.
 *   - An endpoint or GraphQL mutation name supplied entirely by a variable
 *     (`gh api "$URL"`) or produced by an expansion the hook can't evaluate, or
 *     written to an `--input` file later in the same command, is not caught.
 *
 * @see .claude/hooks/strip-review-event.mjs for the Claude Code wrapper.
 * @see .cursor/hooks/strip-review-event.mjs for the Cursor wrapper.
 */

import { readFileSync, writeFileSync } from 'node:fs';

/** Review-creation endpoint path: `/pulls/{n}/reviews` not followed by `/…`. */
const reviewCreationPath = /pulls\/\d+\/reviews(?!\/)/;

/**
 * Review-creation path whose `{n}` is a shell expansion rather than a literal
 * number, e.g. `pulls/$PR/reviews`, `pulls/${PR}/reviews`. The agent commonly
 * stores the PR number in a variable, so this must still be recognised as a
 * review-creation call — otherwise `reviewCreationPath` (numeric only) misses
 * it and the call is never gated. Checked against the resolved endpoint
 * argument only (see `findApiEndpoint`), so a review path appearing in a flag
 * value like `-f body='see pulls/1/reviews'` is not mistaken for the call.
 */
const reviewCreationPathExpanded = /pulls\/[^/]*[$`][^/]*\/reviews(?!\/)/;

/** Field-flag tokens (resolved argv): supplying a body inline instead of `--input`. */
const FIELD_FLAGS = new Set(['-f', '-F', '--field', '--raw-field']);

/**
 * `gh api` flags that consume the following token as their value. Used by
 * `findApiEndpoint` to skip flag values when locating the positional endpoint
 * argument, so a review path inside a flag value (e.g. a `-H` header or a
 * `-f body=` field) is not treated as the endpoint.
 */
const GH_API_VALUE_FLAGS = new Set([
  '-f',
  '-F',
  '--field',
  '--raw-field',
  '-H',
  '--header',
  '-X',
  '--method',
  '--hostname',
  '-q',
  '--jq',
  '-t',
  '--template',
  '--input',
  '--cache',
]);

/**
 * Find the positional endpoint argument of a `gh api` call from its resolved
 * `argv` (prefix already stripped, so `argv[0..1] === ['gh','api']`). Skips
 * flags and their values; `--flag=value` is self-contained. The first
 * remaining bare token is the endpoint (the URL/path `gh api` acts on).
 *
 * A command-substitution id (`pulls/$(printf 1)/reviews`) contains a space the
 * tokenizer splits into adjacent positionals (`pulls/$(printf`, `1)/reviews`),
 * so the contiguous run of positional tokens is joined back with spaces — the
 * rejoined string still matches the expanded-review path. Returns the joined
 * endpoint string or `null`. Because only flag *values* are skipped, a review
 * path inside a flag value (e.g. `-f body='…pulls/1/reviews…'`) is never the
 * endpoint.
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
  if (i >= argv.length) return null;
  const positional = [];
  for (let j = i; j < argv.length && !argv[j].startsWith('-'); j += 1) {
    positional.push(argv[j]);
  }
  return positional.join(' ');
};

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
 * Extract the inner command text of every command substitution — `$(…)`
 * (depth-counted) and `` `…` `` — that the shell would execute. The agent
 * commonly captures CLI output, e.g. `id=$(gh api … reviews …)` or
 * `out=$(gh pr review --approve 1)`, and the nested `gh` runs and can publish.
 * Single-quoted regions are skipped because substitution does not happen there.
 * Returns the inner strings; callers re-analyse each so a publish nested in a
 * substitution is caught by the same rules.
 */
const extractCommandSubstitutions = (src) => {
  const bodies = [];
  let i = 0;
  let quote = null;
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
    if (c === "'" || c === '"') {
      quote = c;
      i += 1;
      continue;
    }
    if (c === '$' && src[i + 1] === '(') {
      let depth = 1;
      let j = i + 2;
      let inner = null;
      while (j < src.length && depth > 0) {
        const cj = src[j];
        if (cj === '(') depth += 1;
        else if (cj === ')') {
          depth -= 1;
          if (depth === 0) {
            inner = src.slice(i + 2, j);
            break;
          }
        }
        j += 1;
      }
      if (inner !== null) {
        bodies.push(inner);
        i = j + 1;
        continue;
      }
    }
    if (c === '`') {
      const end = src.indexOf('`', i + 1);
      if (end !== -1) {
        bodies.push(src.slice(i + 1, end));
        i = end + 1;
        continue;
      }
    }
    i += 1;
  }
  return bodies;
};

/**
 * Analyse a raw shell command. Returns `null` (allow, possibly after stripping
 * a stray `event` key from an `--input` file) or `{ deny: <reason> }`.
 */
export const analyzeReviewCommand = (raw, depth = 0) => {
  if (typeof raw !== 'string' || raw === '') return null;
  if (depth > 8) return null; // guard against pathological nesting

  // Bash removes `\<newline>` entirely (line continuation), so do the same
  // before splitting; otherwise a continued command splits into bogus segments.
  const cmd = raw.replace(/\\\n/g, '');
  const hasHeredoc = heredoc.test(cmd);

  // A publish hidden inside a command substitution (`id=$(gh pr review -a 1)`)
  // still runs, so analyse each substitution body with the same rules.
  for (const inner of extractCommandSubstitutions(cmd)) {
    const result = analyzeReviewCommand(inner, depth + 1);
    if (result) return result;
  }

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

    if (isGh(argv, ['api'])) {
      // Resolve the positional endpoint so global flags before it
      // (`gh api -X POST graphql …`, `gh api -H … graphql …`) don't route
      // GraphQL past this branch into the REST one.
      const endpoint = findApiEndpoint(argv);

      if (endpoint === 'graphql') {
        const result = analyzeGraphql(argv);
        if (result) return result;
        continue;
      }

      // Check the review path against the resolved endpoint argument only, so
      // a review path inside a flag value (e.g. `-f body='…pulls/1/reviews…'`)
      // is not mistaken for the call.
      if (endpoint != null && reviewCreationPathExpanded.test(endpoint)) {
        return {
          deny: `The review-creation endpoint path contains a shell expansion (\`pulls/$VAR/reviews\` etc.) the hook cannot evaluate, so it cannot verify the request body. Use a literal PR number. ${PUBLISH_REASON}`,
        };
      }
      if (endpoint != null && reviewCreationPath.test(endpoint)) {
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
