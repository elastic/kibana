/**
 * Shared analyzer behind the `strip-review-event` hook for both Claude Code
 * and Cursor. Keeps PR review creation in PENDING state.
 *
 * The analyzer never rewrites the shell command. It denies any review-creation
 * shape that would publish the review, and sanitises the only allowed shape
 * — `--input <file>` — by stripping a stray `event` key from the JSON
 * payload on disk via a real parser.
 *
 * Allowed:
 *   POST /pulls/{n}/reviews --input <file>                 (file-based body;
 *                                                           file rewritten on
 *                                                           disk to remove
 *                                                           any `event` key)
 *   POST /pulls/{n}/reviews/{id}/events                    (submission)
 *   PUT  /pulls/{n}/reviews/{id}/dismissals                (dismissal)
 *   anything else under /reviews/{id}/...
 *
 * Denied:
 *   gh api .../reviews -f event=...                        (any quoting form;
 *                                                           detected via
 *                                                           prefix-only
 *                                                           regex)
 *   gh api .../reviews --input -                           (stdin body —
 *                                                           opaque to the hook)
 *   gh api .../reviews --input <path-with-shell-expansion> (opaque to the hook)
 *   gh api .../reviews with any heredoc in the command      (too ambiguous
 *                                                           without a shell
 *                                                           parser)
 *   gh pr review --approve | --request-changes | --comment (immediate publish)
 *
 * Known limitations (no real shell parser; layered defense via skill +
 * warn-github-mcp + human-in-the-loop covers the residual risk):
 *
 *   - Heredocs anywhere in a review-creation command are denied: a
 *     `gh api .../reviews` fragment inside a heredoc body fed to `cat` is
 *     indistinguishable from the real call without a shell parser, so the
 *     analyzer requires creating the payload file in a separate command.
 *   - Nested shell evaluation (`bash -c '...gh api .../reviews ...'`,
 *     `sh -c "..."`, etc.) is not introspected: `apiInvocation` is anchored
 *     to segment start, and a nested invocation is one segment that starts
 *     with `bash`/`sh`. The matcher in `.claude/settings.json` uses
 *     `Bash(gh *)` so the hook does not even spawn for these inputs.
 *
 * @see .claude/hooks/strip-review-event.mjs for the Claude Code wrapper.
 * @see .cursor/hooks/strip-review-event.mjs for the Cursor wrapper.
 */

import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Detects any field flag (`-f`, `-F`, `--field`, `--raw-field`, including
 * pflag's attached shorthand `-ffield=...` / `-f=field=...` / `--field=...`) on
 * a `gh api .../reviews` review-creation command. On the creation endpoint the
 * only sanctioned body shape is `--input <file>`; a field flag is never needed
 * there. Crucially, the hook cannot tell whether a field value is `event=...`:
 * it can be hidden by shell quoting/escaping the name (`$'event=...'`,
 * `\event=...`) or produced entirely by an expansion the hook cannot evaluate
 * (`$(printf event=APPROVE)`, `` `…` ``, `${VAR:-event=APPROVE}`). Rather than
 * chase each shape with a value-aware regex, fail closed: deny any field flag
 * on the creation endpoint and point the agent at `--input <file>`. The
 * submission endpoint (`/reviews/{id}/events`) is a different path and is not
 * matched as a creation call, so `-f event=APPROVE` there stays allowed.
 * Quote-aware iteration in `hasFieldFlagOutsideQuotes` ignores a `-f`/`--field`
 * token that appears only as literal text inside another argument's quotes.
 */
const fieldFlag = /(?:^|\s)(?:-[fF]|--(?:raw-)?field(?:[=\s]|$))/g;

/**
 * Captures the `--input` value (space- or `=`-separated, double-quoted,
 * single-quoted, or bare). The bare branch also captures `-`, which signals
 * stdin and is handled separately.
 */
const inputFilePath =
  /--input(?:\s+|=)("(?<doubleQuoted>[^"]+)"|'(?<singleQuoted>[^']+)'|(?<bare>\S+))/;

/**
 * Optional `NAME=value` env prefix tolerant of shell-quoted values with
 * embedded spaces (e.g. `FOO='x y' gh api`). Without this, `\S*` stops at
 * the first whitespace inside the quoted value and the whole invocation
 * slips past the review-creation detector.
 */
const envPrefix = /(?:\w+=(?:"[^"]*"|'[^']*'|\S*)\s+)*/.source;

/**
 * Optional leading `env` command prefix: `env [flags] [NAME=value ...] gh ...`.
 * The `env` utility execs the trailing command after setting variables, so
 * `env GH_PAGER=cat gh api .../reviews -f event=APPROVE` runs the exact same
 * publishing call as the bare form. The skill tells agents to set
 * `GH_PAGER=cat`, and `env GH_PAGER=cat gh ...` is a natural way to write it,
 * so without this the whole invocation slips past the review-creation /
 * `gh pr review` detectors. Per env(1) the grammar is
 * `env [-0iv] [-C dir] [-P path] [-S string] [-u name] [name=value ...] utility`,
 * so consume `env`, then any flags (the arg-taking `-C/-P/-S/-u` swallow the
 * following token), then any `NAME=value` assignments. The trailing `envPrefix`
 * still handles the no-`env` form (`GH_PAGER=cat gh ...`).
 */
const envCmdPrefix = /(?:env\b(?:\s+(?:-[CPSu]\s+\S+|-[0iv]+|--\S+))*(?:\s+\w+=(?:"[^"]*"|'[^']*'|\S*))*\s+)?/
  .source;

/** Pipeline segment starts with an optional `gh api` invocation (allowing env prefixes). */
const apiInvocation = new RegExp(`^\\s*${envCmdPrefix}${envPrefix}gh\\s+api\\b`);

/** Review-creation endpoint: `/pulls/{n}/reviews` not followed by another path segment. */
const reviewCreation = /pulls\/\d+\/reviews(?!\/)/;

/** GraphQL endpoint invocation: `gh api graphql ...`. */
const graphqlInvocation = new RegExp(`^\\s*${envCmdPrefix}${envPrefix}gh\\s+api\\s+graphql\\b`);

/**
 * The only GraphQL mutation that creates (and can immediately publish) a PR
 * review. `addPullRequestReview` accepts an `event` argument that publishes on
 * submit, and the value can arrive literally (`event: APPROVE`), via a field
 * flag (`-F event=APPROVE`), or via a GraphQL variable (`$event`). A
 * value-aware check would miss the indirect forms, so — mirroring the
 * fail-closed field-flag deny on the REST creation endpoint — deny on the mere
 * presence of the mutation name. No sanctioned workflow uses it: reviews are
 * created via REST `--input <file>` and published via REST `/reviews/{id}/events`.
 */
const addPullRequestReview = /addPullRequestReview\b/;

/** Pipeline segment starts with an optional `gh pr review` invocation (allowing env prefixes). */
const prReviewInvocation = new RegExp(`^\\s*${envCmdPrefix}${envPrefix}gh\\s+pr\\s+review\\b`);

/**
 * Publishing flags accepted by `gh pr review`. Any of them publishes the
 * review immediately. Covers long forms (`--approve`, `--request-changes`,
 * `--comment`) and short forms (`-a`, `-r`, `-c`), including combined short
 * forms like `-ar` or `-arc` that pflag also accepts. The `g` flag lets the
 * quote-aware iterator skip matches that fall inside shell-quoted regions
 * (e.g. review bodies that happen to contain ` -a ` as literal text).
 */
const prReviewPublishFlag =
  /(?:^|\s)(?:--(?:approve|request-changes|comment)|-[a-zA-Z]*[arc][a-zA-Z]*)\b/g;

/**
 * Heredoc opener: `<<EOF`, `<<-EOF`, `<<'EOF'`, `<<"EOF"`, `<<\EOF`. The
 * backslash form is valid shell syntax equivalent to `<<'EOF'`, so it must
 * trigger the deny the same way the other quoted forms do — otherwise the
 * heredoc body can look like a stray `gh api .../reviews` segment and the
 * analyzer can either false-trigger on text fed to `cat` or skip sanitizing a
 * real review-creation call.
 */
const heredoc = /<<-?\s*['"\\]?\w/;

/**
 * Characters that make the path the shell resolves differ from what
 * `readFileSync` reads here, leaving the real payload file unchecked. `$` and
 * backtick expand inside double quotes too, so they are always rejected via
 * this regex. A leading `~`, a backslash escape, and process-substitution /
 * redirection metacharacters (`<`, `>`, e.g. `<(...)` / `>(...)`) only carry
 * special meaning unquoted, so those are rejected for bare captures only (see
 * `analyzeCreationSegment`). Single-quoted captures are exempt entirely
 * because single quotes suppress all shell processing.
 */
const shellExpansionInPath = /[$`]/;

const isReviewCreationCall = (segment) =>
  apiInvocation.test(segment) && reviewCreation.test(segment);

const isGraphqlReviewCreation = (segment) =>
  graphqlInvocation.test(segment) && addPullRequestReview.test(segment);

const isPrReviewPublish = (segment) =>
  prReviewInvocation.test(segment) && hasPublishFlagOutsideQuotes(segment);

/**
 * Returns `[start, end)` offsets for every quoted region in `src`. Both
 * single- and double-quoted regions are reported (the closing quote is
 * exclusive). Inside a double-quoted region a backslash escapes the next
 * character so `"a\"b"` is treated as one region.
 */
const getQuotedRanges = (src) => {
  const ranges = [];
  let i = 0;
  let quote = null;
  let quoteStart = 0;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      if (c === '\\' && quote === '"' && i + 1 < src.length) {
        i += 2;
        continue;
      }
      if (c === quote) {
        ranges.push([quoteStart, i + 1]);
        quote = null;
      }
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      quoteStart = i;
    }
    i += 1;
  }
  return ranges;
};

const isInsideAnyRange = (idx, ranges) => {
  for (const [start, end] of ranges) {
    if (idx >= start && idx < end) return true;
  }
  return false;
};

/**
 * Returns `true` if any `fieldFlag` match in `segment` lies outside a
 * shell-quoted region. The flag may be matched at the very start of the
 * segment or after whitespace; the offset of that boundary (not the leading
 * whitespace) is what gets quote-checked, so a `-f` appearing only as literal
 * text inside another argument like `-b "see -f event=test"` does not
 * false-trigger a deny.
 */
const hasFieldFlagOutsideQuotes = (segment) => {
  const ranges = getQuotedRanges(segment);
  fieldFlag.lastIndex = 0;
  let m;
  while ((m = fieldFlag.exec(segment)) !== null) {
    const dashIdx = m.index + m[0].indexOf('-');
    if (!isInsideAnyRange(dashIdx, ranges)) return true;
  }
  return false;
};

/**
 * Reports whether any `prReviewPublishFlag` match in `segment` falls outside
 * a shell-quoted region. The flag regex intentionally over-matches combined
 * short forms like `-arc`, so the same pattern will also match inside a
 * `-b "text -a here"` body. Gating on quote state removes that false
 * positive without loosening the flag pattern.
 */
const hasPublishFlagOutsideQuotes = (segment) => {
  const ranges = getQuotedRanges(segment);
  prReviewPublishFlag.lastIndex = 0;
  let m;
  while ((m = prReviewPublishFlag.exec(segment)) !== null) {
    const dashOffset = m[0].indexOf('-');
    if (dashOffset < 0) continue;
    const dashIdx = m.index + dashOffset;
    if (!isInsideAnyRange(dashIdx, ranges)) return true;
  }
  return false;
};

/**
 * Walks `src` tracking quote state and returns `{ start, end }` offsets for
 * every top-level pipeline segment, splitting on `;`, `|`, single `&`, `&&`,
 * `||`, and newlines that fall outside a shell-quoted region.
 */
const collectSegments = (src) => {
  const segments = [];
  let i = 0;
  let quote = null;
  let segStart = 0;

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
    const isSep2 = two === '&&' || two === '||';
    const isSep1 =
      c === ';' ||
      c === '|' ||
      c === '\n' ||
      (c === '&' && src[i + 1] !== '&');
    if (isSep2 || isSep1) {
      segments.push({ start: segStart, end: i });
      const step = isSep2 ? 2 : 1;
      segStart = i + step;
      i = segStart;
      continue;
    }
    i += 1;
  }
  segments.push({ start: segStart, end: src.length });
  return segments;
};

/**
 * Returns the first top-level segment satisfying `predicate`, as
 * `{ start, end }` offsets into `src`, or `null` when none match.
 */
const findSegmentSlice = (src, predicate) =>
  collectSegments(src).find((seg) => predicate(src.slice(seg.start, seg.end))) ??
  null;

/**
 * Returns every top-level segment satisfying `predicate`. Unlike
 * `findSegmentSlice`, this does not stop at the first hit: a command can chain
 * several review-creation calls (e.g. a safe `--input <file>` call followed by
 * a publishing `-f event=` call), and each segment must be inspected so a
 * later segment cannot smuggle a publish past the deny.
 */
const findAllSegmentSlices = (src, predicate) =>
  collectSegments(src).filter((seg) => predicate(src.slice(seg.start, seg.end)));

/**
 * Inspect a single review-creation segment. Returns `{ deny }` when the
 * segment would publish the review or is otherwise opaque to the hook, or
 * `null` after sanitising an `--input <file>` payload in place. `raw` is the
 * full (un-split) command, needed only for the heredoc ambiguity check.
 */
const analyzeCreationSegment = (segment, raw) => {
  const fileMatch = segment.match(inputFilePath);
  const filePath = fileMatch
    ? fileMatch.groups.doubleQuoted ||
      fileMatch.groups.singleQuoted ||
      fileMatch.groups.bare
    : null;
  const filePathSource = fileMatch
    ? fileMatch.groups.doubleQuoted != null
      ? 'doubleQuoted'
      : fileMatch.groups.singleQuoted != null
      ? 'singleQuoted'
      : 'bare'
    : null;

  if (filePath === '-') {
    return {
      deny: '`gh api .../reviews --input -` reads the request body from stdin, which the hook cannot inspect or rewrite. Write the body to a file and pass it as `--input <file>` so the `event` field can be stripped before submission.',
    };
  }

  if (filePath && filePathSource !== 'singleQuoted') {
    const hasUnreadablePath =
      shellExpansionInPath.test(filePath) ||
      (filePathSource === 'bare' &&
        (filePath.startsWith('~') ||
          filePath.includes('\\') ||
          filePath.includes('<') ||
          filePath.includes('>')));
    if (hasUnreadablePath) {
      return {
        deny: 'The `--input` path contains a shell construct the hook cannot evaluate — shell expansion (`$VAR`, `$(...)`, backticks, a leading `~`), a backslash escape (e.g. `path\\ with\\ spaces.json`), or process substitution / redirection (`<(...)`, `>(...)`, `<`, `>`). The shell resolves these at exec time but the hook reads the literal path, so the real request body would slip through unchecked. Write the body to a plain file and pass an absolute, already-expanded path (single- or double-quoted), so the file can be rewritten before submission.',
      };
    }
  }

  // Heredocs can embed text that looks like a `gh api` invocation. Without a
  // shell parser we can't tell whether the matched segment is the real call or
  // a heredoc body, and a heredoc used to create a JSON payload can otherwise
  // skip the `--input <file>` sanitizer below. Deny the ambiguous shape and ask
  // the agent to create the payload file in a separate command.
  if (heredoc.test(raw)) {
    return {
      deny: 'The `gh api .../reviews` command appears together with a heredoc. The hook cannot safely distinguish heredoc body text from the real review-creation call, and this shape can bypass the `--input <file>` sanitizer. Write the JSON payload file in a separate command, then run `gh api repos/{owner}/{repo}/pulls/{number}/reviews --input <file>`.',
    };
  }

  if (hasFieldFlagOutsideQuotes(segment)) {
    return {
      deny: 'Passing fields via `-f`/`-F`/`--field`/`--raw-field` on the `gh api .../reviews` creation command is not allowed: a field value can be (or expand to) `event=...` — directly, through name quoting/escaping (`$\'event=...\'`, `\\event=...`), or through an expansion the hook cannot evaluate (`$(...)`, backticks, `${VAR:-...}`) — which publishes the review immediately. Write the entire request body to a JSON file (omitting `event`) and submit it via `gh api repos/{owner}/{repo}/pulls/{number}/reviews --input <file>`. The hook strips any stray `event` key before `gh` runs. Submit the review explicitly later via `gh api repos/{owner}/{repo}/pulls/{number}/reviews/{review_id}/events -f event=APPROVE`.',
    };
  }

  if (filePath) {
    try {
      const payload = JSON.parse(readFileSync(filePath, 'utf-8'));
      if (
        payload !== null &&
        typeof payload === 'object' &&
        !Array.isArray(payload) &&
        'event' in payload
      ) {
        delete payload.event;
        writeFileSync(filePath, JSON.stringify(payload, null, 2));
      }
    } catch {
      // Fail closed. The hook runs before the shell executes, so a payload
      // created earlier in the same command (e.g.
      // `printf '{"event":"APPROVE"}' > body.json; gh api .../reviews --input body.json`)
      // does not exist yet, and an unreadable / non-JSON file can't be checked
      // for a stray `event` key. Allowing it would let `gh` read an
      // unsanitised body and publish. Require the payload file to already exist
      // and be valid JSON at hook time (write it in a separate, earlier
      // command), matching the documented `--input <file>` flow.
      return {
        deny: 'The hook cannot read or parse the `--input` file before `gh` runs, so it cannot strip a stray `event` key. This usually means the payload is created in the same command (e.g. `printf ... > body.json; gh api .../reviews --input body.json`) or the file is not valid JSON. Write a well-formed JSON payload file (no `event` key) at an absolute path in a separate, earlier command, then run `gh api repos/{owner}/{repo}/pulls/{number}/reviews --input <file>`.',
      };
    }
  }

  return null;
};

/**
 * Analyse a raw shell command and return either `null` (allow, possibly
 * after rewriting an `--input <file>` payload to drop an `event` key) or
 * `{ deny: <reason> }` with a deny reason. The wrappers translate the
 * return value into the per-tool output JSON shape.
 */
export const analyzeReviewCommand = (raw) => {
  if (typeof raw !== 'string' || raw === '') return null;

  // Normalize line continuations the way bash does: `\<newline>` (both
  // outside and inside double quotes) is removed entirely, not replaced
  // with a space. Without this, `findSegmentSlice` splits on the bare
  // `\n` and a multi-line `gh api .../reviews \<nl> -f event=APPROVE`
  // invocation would be seen as two separate segments, with `event=...`
  // landing in a segment that no longer matches the review-creation
  // regex and slipping past the deny.
  const cmd = raw.replace(/\\\n/g, '');

  if (findSegmentSlice(cmd, isPrReviewPublish)) {
    return {
      deny: '`gh pr review --approve | --request-changes | --comment` publishes the review immediately. Create the review in PENDING state by writing the request body to a JSON file (no `event` key) and submitting it via `gh api repos/{owner}/{repo}/pulls/{number}/reviews --input <file>`, then submit the review explicitly with `gh api repos/{owner}/{repo}/pulls/{number}/reviews/{review_id}/events -f event=APPROVE`.',
    };
  }

  if (findSegmentSlice(cmd, isGraphqlReviewCreation)) {
    return {
      deny: 'The GraphQL `addPullRequestReview` mutation creates a review and publishes it immediately when an `event` is set (and `event` can be supplied literally, via `-F event=...`, or via a `$event` variable the hook cannot evaluate). Create the review in PENDING state through the REST endpoint instead: write the request body to a JSON file (no `event` key) and run `gh api repos/{owner}/{repo}/pulls/{number}/reviews --input <file>`, then submit it explicitly with `gh api repos/{owner}/{repo}/pulls/{number}/reviews/{review_id}/events -f event=APPROVE`.',
    };
  }

  // Inspect every review-creation segment, not just the first. A chain such as
  // `gh api .../reviews --input safe.json; gh api .../reviews -f event=COMMENT`
  // has a benign first segment and a publishing second segment; stopping at the
  // first match would sanitise `safe.json`, allow the command, and let the
  // second call publish. Deny on the first segment that fails any check.
  const slices = findAllSegmentSlices(cmd, isReviewCreationCall);
  if (slices.length === 0) return null;

  for (const slice of slices) {
    const result = analyzeCreationSegment(cmd.slice(slice.start, slice.end), raw);
    if (result) return result;
  }

  return null;
};
