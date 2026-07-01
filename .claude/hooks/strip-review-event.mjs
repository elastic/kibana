#!/usr/bin/env node

/**
 * PreToolUse hook (Claude Code) that defers to the shared analyzer in
 * `.agents/hooks/strip-review-event.mjs` and emits Claude's nested
 * `hookSpecificOutput.permissionDecision` deny shape. See the shared module
 * for the policy, allowed/denied shapes, and known limitations.
 *
 * @see .agents/hooks/strip-review-event.mjs
 * @see .cursor/hooks/strip-review-event.mjs for the Cursor wrapper.
 */

import { json } from 'node:stream/consumers';
import { analyzeReviewCommand } from '../../.agents/hooks/strip-review-event.mjs';

let input;
try {
  input = await json(process.stdin);
} catch {
  process.exit(0);
}
if (!input || typeof input !== 'object') process.exit(0);

const result = analyzeReviewCommand(input?.tool_input?.command ?? '');
if (!result) process.exit(0);

process.stdout.write(
  JSON.stringify(
    {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: result.deny,
      },
    },
    null,
    2
  )
);
