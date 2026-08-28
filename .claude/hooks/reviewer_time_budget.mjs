#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';

const OVERALL_LIMIT_MINUTES = 20;
const OVERALL_LIMIT_MS = OVERALL_LIMIT_MINUTES * 60 * 1000;
const STOP_WORK_PERCENT = 85;
const MILESTONE_PERCENTS = [25, 50, 75];
const START_FILE = process.env.REVIEWER_TIME_BUDGET_START_FILE || '/tmp/gh-aw/agent_cli_start_ms.txt';
const STATE_FILE =
  process.env.REVIEWER_TIME_BUDGET_STATE_FILE ||
  '/tmp/gh-aw/reviewer_time_budget_last_milestone.txt';

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
  try {
    const value = Number(readFileSync(filePath, 'utf8').trim());
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

const startedAtMs = readNumber(START_FILE);
if (startedAtMs === null) {
  process.exit(0);
}

const nowMs = Number(process.env.REVIEWER_TIME_BUDGET_NOW_MS) || Date.now();
const elapsedMs = Math.max(0, nowMs - startedAtMs);
const elapsedPercent = Math.floor((elapsedMs / OVERALL_LIMIT_MS) * 100);

const emit = (suffix) => {
  process.stdout.write(
    JSON.stringify(
      {
        hookSpecificOutput: {
          hookEventName: 'PostToolBatch',
          additionalContext: `Reviewer time budget: ${elapsedPercent}% of the configured ${OVERALL_LIMIT_MINUTES} minute limit has elapsed.${suffix}`,
        },
      },
      null,
      2
    )
  );
};

if (elapsedPercent >= STOP_WORK_PERCENT) {
  emit(' Stop all work now and produce a review output.');
  process.exit(0);
}

const readLastMilestone = () => {
  try {
    const value = Number(readFileSync(STATE_FILE, 'utf8').trim());
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
};

const crossedMilestone = MILESTONE_PERCENTS.filter((milestone) => elapsedPercent >= milestone).pop() ?? 0;

if (crossedMilestone > readLastMilestone()) {
  try {
    writeFileSync(STATE_FILE, String(crossedMilestone));
  } catch {
    // Ignore state persistence failures so the hook never crashes a batch.
  }
  emit('');
}
