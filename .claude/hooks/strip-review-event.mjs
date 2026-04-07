#!/usr/bin/env node

/**
 * PreToolUse hook (Claude Code): strip "event" from gh api review-creation calls.
 *
 * Review creation: POST /repos/{o}/{r}/pulls/{n}/reviews
 * Review submission: POST /repos/{o}/{r}/pulls/{n}/reviews/{id}/events
 *
 * Only the creation endpoint is intercepted. The submission endpoint
 * (which legitimately requires "event") is left alone.
 *
 * @see .cursor/hooks/strip-review-event.mjs for the Cursor counterpart.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { json } from 'node:stream/consumers';

/** Matches `gh api ... pulls/{n}/reviews` (review creation or submission). */
const reviewEndpoint = /gh\s+api\s+.*pulls\/\d+\/reviews/;

/** Matches the submission endpoint `reviews/{id}/events` — must not be intercepted. */
const submissionEndpoint = /reviews\/\d+\/events/;

/** Matches `-f event=...` or `-F event=...` flag pairs in a gh api command. */
const eventFlag = /\s-[fF]\s+event=\S*/g;

/** Extracts the file path from `--input <path>` (double-quoted, single-quoted, or bare). */
const inputFilePath = /--input\s+("(?<doubleQuoted>[^"]+)"|'(?<singleQuoted>[^']+)'|(?<bare>\S+))/;

let input;
try {
  input = await json(process.stdin);
} catch {
  process.exit(0);
}
if (!input || typeof input !== 'object') process.exit(0);
let cmd = input?.tool_input?.command ?? '';

// Avoid rewriting multi-line commands (e.g. heredocs) where `gh api ...` may
// appear as text rather than an actual invocation.
if (cmd.includes('\n')) process.exit(0);

if (!reviewEndpoint.test(cmd)) process.exit(0);
if (submissionEndpoint.test(cmd)) process.exit(0);

let dirty = false;

if (eventFlag.test(cmd)) {
  eventFlag.lastIndex = 0;
  cmd = cmd.replace(eventFlag, '');
  dirty = true;
}

const fileMatch = cmd.match(inputFilePath);
if (fileMatch) {
  const { doubleQuoted, singleQuoted, bare } = fileMatch.groups;
  const path = doubleQuoted || singleQuoted || bare;

  try {
    const payload = JSON.parse(readFileSync(path, 'utf-8'));
    if ('event' in payload) {
      delete payload.event;
      writeFileSync(path, JSON.stringify(payload, null, 2));
      dirty = true;
    }
  } catch {
    /* file doesn't exist or isn't JSON — skip */
  }
}

if (!dirty) process.exit(0);

process.stdout.write(
  JSON.stringify(
    {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason:
          'Stripped event from review creation payload to keep the review in PENDING state.',
        updatedInput: { command: cmd },
      },
    },
    null,
    2
  )
);
