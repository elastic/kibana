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
 * Detects an `event=` flag pair on `gh api .../reviews` regardless of how
 * the value is quoted. Only the prefix
 * `(-f|-F|--field|--raw-field …)['"]?event=` matters, including pflag's
 * attached shorthand values (`-fevent=...`, `-f=event=...`) — the regex never
 * consumes the value, so every value-side shell-quoting and shell-expansion
 * shape is covered without alternation: bare, single-quoted, double-quoted,
 * whole-pair quoted, `$(…)`, backticks, `${VAR:-…}`. The match drives a `deny`
 * decision pointing the agent at the canonical `--input <file>` path;
 * quote-aware iteration in `hasEventFlagOutsideQuotes` ignores literal
 * `event=` text inside a `-f body="…"` argument.
 */
const eventFlag = /\s(?:-[fF](?:=|\s+)?|--(?:raw-)?field(?:=|\s+))['"]?event=/g;

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

/** Pipeline segment starts with an optional `gh api` invocation (allowing env prefixes). */
const apiInvocation = new RegExp(`^\\s*${envPrefix}gh\\s+api\\b`);

/** Review-creation endpoint: `/pulls/{n}/reviews` not followed by another path segment. */
const reviewCreation = /pulls\/\d+\/reviews(?!\/)/;

/** Pipeline segment starts with an optional `gh pr review` invocation (allowing env prefixes). */
const prReviewInvocation = new RegExp(`^\\s*${envPrefix}gh\\s+pr\\s+review\\b`);

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
 * Shell-expansion characters that the hook cannot evaluate. A `--input` path
 * containing any of `$`, backtick, or a leading `~` would be expanded by the
 * shell at exec time but read literally by `readFileSync` here, leaving the
 * actual payload file unchecked. Single-quoted captures are exempt because
 * single quotes suppress shell expansion entirely.
 */
const shellExpansionInPath = /[$`]/;

const isReviewCreationCall = (segment) =>
  apiInvocation.test(segment) && reviewCreation.test(segment);

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
 * Returns `true` if any `eventFlag` match in `segment` lies outside a
 * shell-quoted region. Matches inside quoted regions are ignored so that a
 * body argument like `-f body='example -f event=test'` does not
 * false-trigger a deny.
 */
const hasEventFlagOutsideQuotes = (segment) => {
  const ranges = getQuotedRanges(segment);
  eventFlag.lastIndex = 0;
  let m;
  while ((m = eventFlag.exec(segment)) !== null) {
    if (!isInsideAnyRange(m.index, ranges)) return true;
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
 * Walks `src` tracking quote state and returns the first top-level pipeline
 * segment satisfying `predicate`, as `{ start, end }` offsets into `src`.
 * Returns `null` when no such segment exists.
 */
const findSegmentSlice = (src, predicate) => {
  let i = 0;
  let quote = null;
  let segStart = 0;

  const consider = (segEnd) => {
    const text = src.slice(segStart, segEnd);
    return predicate(text) ? { start: segStart, end: segEnd } : null;
  };

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
      const hit = consider(i);
      if (hit) return hit;
      const step = isSep2 ? 2 : 1;
      segStart = i + step;
      i = segStart;
      continue;
    }
    i += 1;
  }
  return consider(src.length);
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

  const slice = findSegmentSlice(cmd, isReviewCreationCall);
  if (!slice) return null;

  const segment = cmd.slice(slice.start, slice.end);

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
    const hasShellExpansion =
      shellExpansionInPath.test(filePath) ||
      (filePathSource === 'bare' && filePath.startsWith('~'));
    if (hasShellExpansion) {
      return {
        deny: 'The `--input` path contains shell expansion (`$VAR`, `$(...)`, backticks, or a leading `~`). The hook reads the literal path and cannot expand shell metacharacters, so the request body would slip through unchecked. Pass an absolute or already-expanded path so the file can be rewritten before submission.',
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

  if (hasEventFlagOutsideQuotes(segment)) {
    return {
      deny: 'Passing `event` on the `gh api .../reviews` command line publishes the review immediately. Write the request body to a JSON file (omitting `event`) and submit it via `gh api repos/{owner}/{repo}/pulls/{number}/reviews --input <file>`. The hook reads the file and strips any stray `event` key before `gh` runs. Submit the review explicitly later via `gh api repos/{owner}/{repo}/pulls/{number}/reviews/{review_id}/events -f event=APPROVE`.',
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
      /* file doesn't exist or isn't JSON — skip */
    }
  }

  return null;
};
