#!/usr/bin/env node

/**
 * PreToolUse hook (Claude Code): warn once per install when a GitHub MCP
 * server is active, since the Kibana repo provides a gh-based skill that
 * covers the same functionality without the ~50k token overhead.
 *
 * The warning is gated by a marker file under `XDG_STATE_HOME` (or
 * `~/.local/state`), so it is shown at most once per user on this machine.
 * Remove the marker to re-arm the warning.
 */

import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { json } from 'node:stream/consumers';

let input;
try {
  input = await json(process.stdin);
} catch {
  process.exit(0);
}
if (!input || typeof input !== 'object') process.exit(0);

const stateDir = join(
  process.env.XDG_STATE_HOME ||
    (process.env.HOME
      ? join(process.env.HOME, '.local', 'state')
      : process.env.TMPDIR || '/tmp'),
  'kibana-claude'
);
const marker = join(stateDir, 'github-mcp-warned');

if (existsSync(marker)) {
  process.exit(0);
}

mkdirSync(stateDir, { recursive: true });
writeFileSync(marker, '');

const msg =
  'WARNING: A GitHub MCP server is active, which adds ~50k tokens of overhead per session. The Kibana repo already provides a gh-based GitHub skill that covers the same functionality and is well-supported by all major models. Consider removing the MCP server to save context budget.';

process.stdout.write(
  JSON.stringify(
    {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: msg,
      },
    },
    null,
    2
  )
);
