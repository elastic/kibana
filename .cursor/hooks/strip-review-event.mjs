#!/usr/bin/env node

/**
 * preToolUse hook (Cursor, matcher: Shell): keep PR review creation in PENDING
 * state.
 *
 * Rewrites `gh api` review-creation calls to drop the `event` field, so the
 * review is created but not published. The user submits it explicitly via the
 * `/reviews/{id}/events` endpoint.
 *
 * Rewritten:
 *   POST /repos/{o}/{r}/pulls/{n}/reviews                  (review creation)
 *
 * Left alone (these legitimately require an `event` value):
 *   POST /repos/{o}/{r}/pulls/{n}/reviews/{id}/events      (submission)
 *   PUT  /repos/{o}/{r}/pulls/{n}/reviews/{id}/dismissals  (dismissal)
 *   anything else under /reviews/{id}/...
 *
 * Denied (cannot be made safe by rewrite):
 *   `gh api .../reviews --input -`                         (body from stdin)
 *   `gh pr review --approve | --request-changes | --comment` (immediate publish)
 *
 * @see .claude/hooks/strip-review-event.mjs for the Claude Code counterpart.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { json } from 'node:stream/consumers';

/**
 * Matches `-f|-F|--field|--raw-field (space|=)event=...` flag pairs in a
 * `gh api` invocation. Covers all four flag names and both separators so a
 * silent-publish bypass via long-form flags is impossible.
 */
const eventFlag = /\s(?:-[fF]\s+|--(?:raw-)?field(?:=|\s+))event=\S*/g;

/**
 * Captures the `--input` value (space- or `=`-separated, double-quoted,
 * single-quoted, or bare). The bare branch also captures `-`, which signals
 * stdin and is handled separately.
 */
const inputFilePath =
  /--input(?:\s+|=)("(?<doubleQuoted>[^"]+)"|'(?<singleQuoted>[^']+)'|(?<bare>\S+))/;

/** Pipeline segment starts with an optional `gh api` invocation (allowing env prefixes). */
const apiInvocation = /^\s*(?:\w+=\S*\s+)*gh\s+api\b/;

/** Review-creation endpoint: `/pulls/{n}/reviews` not followed by another path segment. */
const reviewCreation = /pulls\/\d+\/reviews(?!\/)/;

/** Pipeline segment starts with an optional `gh pr review` invocation (allowing env prefixes). */
const prReviewInvocation = /^\s*(?:\w+=\S*\s+)*gh\s+pr\s+review\b/;

/**
 * Publishing flags accepted by `gh pr review`. Any of them publishes the
 * review immediately. Covers long forms (`--approve`, `--request-changes`,
 * `--comment`) and short forms (`-a`, `-r`, `-c`), including combined short
 * forms like `-ar` or `-arc` that pflag also accepts.
 */
const prReviewPublishFlag =
  /(?:^|\s)(?:--(?:approve|request-changes|comment)|-[a-zA-Z]*[arc][a-zA-Z]*)\b/;

/** Heredoc opener: `<<EOF`, `<<-EOF`, `<<'EOF'`, `<<"EOF"`. */
const heredoc = /<<-?\s*['"]?\w/;

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
  prReviewInvocation.test(segment) && prReviewPublishFlag.test(segment);

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
 * Strips every `eventFlag` match in `segment` that lies outside any quoted
 * region. Matches inside quoted regions are preserved so that a body argument
 * like `-f body='example -f event=test'` is not corrupted by the rewrite.
 */
const stripEventFlagsOutsideQuotes = (segment) => {
  const ranges = getQuotedRanges(segment);
  const matches = [];
  let m;
  eventFlag.lastIndex = 0;
  while ((m = eventFlag.exec(segment)) !== null) {
    if (!isInsideAnyRange(m.index, ranges)) {
      matches.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  if (matches.length === 0) return { result: segment, dirty: false };
  let result = '';
  let cursor = 0;
  for (const { start, end } of matches) {
    result += segment.slice(cursor, start);
    cursor = end;
  }
  result += segment.slice(cursor);
  return { result, dirty: true };
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

const deny = (reason) => {
  process.stdout.write(
    JSON.stringify(
      {
        permission: 'deny',
        user_message: reason,
        agent_message: reason,
      },
      null,
      2
    )
  );
  process.exit(0);
};

let input;
try {
  input = await json(process.stdin);
} catch {
  process.exit(0);
}
if (!input || typeof input !== 'object') process.exit(0);
const raw = input?.tool_input?.command ?? '';
if (typeof raw !== 'string' || raw === '') process.exit(0);

// Normalize line continuations: `\<newline>` becomes a single space so a
// multi-line `gh api \` <newline> `  --field event=APPROVE` is treated as
// one segment.
const cmd = raw.replace(/\\\n/g, ' ');

if (findSegmentSlice(cmd, isPrReviewPublish)) {
  deny(
    '`gh pr review --approve | --request-changes | --comment` publishes the review immediately. Create the review in PENDING state with `gh api repos/{owner}/{repo}/pulls/{number}/reviews` (no `event` field), then submit it explicitly via `gh api repos/{owner}/{repo}/pulls/{number}/reviews/{review_id}/events -f event=APPROVE`.'
  );
}

const slice = findSegmentSlice(cmd, isReviewCreationCall);
if (!slice) process.exit(0);

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
  deny(
    '`gh api .../reviews --input -` reads the request body from stdin, which the hook cannot inspect or rewrite. Write the body to a file and pass it as `--input <file>` so the `event` field can be stripped before submission.'
  );
}

if (filePath && filePathSource !== 'singleQuoted') {
  const hasShellExpansion =
    shellExpansionInPath.test(filePath) ||
    (filePathSource === 'bare' && filePath.startsWith('~'));
  if (hasShellExpansion) {
    deny(
      'The `--input` path contains shell expansion (`$VAR`, `$(...)`, backticks, or a leading `~`). The hook reads the literal path and cannot expand shell metacharacters, so the request body would slip through unchecked. Pass an absolute or already-expanded path so the file can be rewritten before submission.'
    );
  }
}

// Heredocs can embed text that looks like a `gh api` invocation. Without a
// shell parser we can't tell whether the matched segment is the real call or
// a heredoc body, so bail rather than risk corrupting heredoc content. This
// runs after the stdin/pr-review deny checks so heredoc-fed stdin payloads
// are denied instead of silently allowed.
if (heredoc.test(raw)) process.exit(0);

let mutated = segment;
let dirty = false;

const stripped = stripEventFlagsOutsideQuotes(mutated);
mutated = stripped.result;
if (stripped.dirty) dirty = true;

if (filePath) {
  try {
    const payload = JSON.parse(readFileSync(filePath, 'utf-8'));
    if ('event' in payload) {
      delete payload.event;
      writeFileSync(filePath, JSON.stringify(payload, null, 2));
      dirty = true;
    }
  } catch {
    /* file doesn't exist or isn't JSON — skip */
  }
}

if (!dirty) process.exit(0);

const next = cmd.slice(0, slice.start) + mutated + cmd.slice(slice.end);

process.stdout.write(
  JSON.stringify(
    {
      permission: 'allow',
      updated_input: { ...input.tool_input, command: next },
    },
    null,
    2
  )
);
