#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const OVERALL_LIMIT_MINUTES = 20;
const OVERALL_LIMIT_MS = OVERALL_LIMIT_MINUTES * 60 * 1000;
const STOP_WORK_PERCENT = 85;
const START_FILE = process.env.REVIEWER_TIME_BUDGET_START_FILE || '/tmp/gh-aw/agent_cli_start_ms.txt';

if (
  !(
    process.env.GITHUB_AW === 'true' &&
    process.env.GH_AW_PHASE === 'agent' &&
    process.env.GH_AW_WORKFLOW_ID_SANITIZED === 'reviewerclaude'
  )
) {
  process.exit(0);
}

const readNumber = (filePath) => {
  const value = Number(readFileSync(filePath, 'utf8').trim());
  return Number.isFinite(value) ? value : null;
};

const startedAtMs = readNumber(START_FILE);
if (startedAtMs === null) {
  process.exit(0);
}

const nowMs = Number(process.env.REVIEWER_TIME_BUDGET_NOW_MS) || Date.now();
const elapsedMs = Math.max(0, nowMs - startedAtMs);
const elapsedPercent = Math.floor((elapsedMs / OVERALL_LIMIT_MS) * 100);

process.stdout.write(
  JSON.stringify(
    {
      hookSpecificOutput: {
        hookEventName: 'PostToolBatch',
        additionalContext: `Reviewer time budget: ${elapsedPercent}% of the configured ${OVERALL_LIMIT_MINUTES} minute limit has elapsed.${elapsedPercent > STOP_WORK_PERCENT ? ' Stop all work now and produce a review output.' : ''
          }`,
      },
    },
    null,
    2
  )
);
