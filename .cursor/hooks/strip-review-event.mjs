#!/usr/bin/env node

/**
 * preToolUse hook (Cursor, matcher: Shell) that defers to the shared
 * analyzer in `.agents/hooks/strip-review-event.mjs` and emits Cursor's
 * native flat `{ permission, user_message, agent_message }` deny shape. See
 * the shared module for the policy, allowed/denied shapes, and known
 * limitations.
 *
 * @see .agents/hooks/strip-review-event.mjs
 * @see .claude/hooks/strip-review-event.mjs for the Claude Code wrapper.
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
      permission: 'deny',
      user_message: result.deny,
      agent_message: result.deny,
    },
    null,
    2
  )
);
