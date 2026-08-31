#!/usr/bin/env node
// PR size advisory — warns when additions or changed files exceed review-quality
// thresholds. Calibrated against kibana May-Jul 2026 data (n=5,477 PRs, backports
// excluded). Soft-limit only: never blocks, just adds context.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const SOFT_LINES = Number(process.env.PR_SIZE_SOFT_LINES ?? '500');
const SOFT_FILES = Number(process.env.PR_SIZE_SOFT_FILES ?? '15');
const DEBOUNCE_SECS = Number(process.env.PR_SIZE_DEBOUNCE_SECS ?? '30');

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

// Debounce: skip if the check ran recently for this project.
const debounceKey = createHash('md5').update(projectDir).digest('hex').slice(0, 8);
const debounceFile = join(tmpdir(), `pr-size-guard-${debounceKey}`);
const nowSecs = Math.floor(Date.now() / 1000);
if (existsSync(debounceFile)) {
  const last = Number(readFileSync(debounceFile, 'utf8').trim()) || 0;
  if (nowSecs - last < DEBOUNCE_SECS) process.exit(0);
}
writeFileSync(debounceFile, String(nowSecs));

// Git helper — always uses --no-optional-locks, never fetches.
const git = (...args) => {
  try {
    return execFileSync('git', ['--no-optional-locks', ...args], {
      cwd: projectDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
};

const defaultBranchRef = git('symbolic-ref', 'refs/remotes/origin/HEAD');
const defaultBranch = defaultBranchRef?.replace('refs/remotes/origin/', '') ?? 'main';

const headSha = git('rev-parse', 'HEAD');
const originSha = git('rev-parse', `origin/${defaultBranch}`);
if (!headSha || !originSha) process.exit(0);

// Merge-base is cached keyed on (HEAD sha, origin/<default> sha) so it is only
// recomputed when either ref actually moves.
const cacheDir = join(tmpdir(), 'pr-size-cache');
mkdirSync(cacheDir, { recursive: true });
const cacheKey = createHash('md5').update(`${headSha}:${originSha}`).digest('hex');
const cacheFile = join(cacheDir, cacheKey);

let mergeBase;
if (existsSync(cacheFile)) {
  mergeBase = readFileSync(cacheFile, 'utf8').trim();
} else {
  mergeBase = git('merge-base', 'HEAD', `origin/${defaultBranch}`);
  if (!mergeBase) process.exit(0);
  writeFileSync(cacheFile, mergeBase);
}

// Count additions and changed files (additions only — deletions don't penalise refactors).
const diffOut = git('diff', '--numstat', mergeBase, 'HEAD');
if (!diffOut) process.exit(0);

let additions = 0;
let files = 0;
for (const line of diffOut.split('\n')) {
  if (!line.trim()) continue;
  const [added] = line.split('\t');
  if (added === '-') continue; // binary file
  additions += Number(added) || 0;
  files += 1;
}

const warnLines = additions >= SOFT_LINES;
const warnFiles = files >= SOFT_FILES;
if (!warnLines && !warnFiles) process.exit(0);

let detail;
if (warnLines && warnFiles) {
  detail = `both the line count (${additions} ≥ ${SOFT_LINES}) and file count (${files} ≥ ${SOFT_FILES}) exceed`;
} else if (warnLines) {
  detail = `the line count (${additions} ≥ ${SOFT_LINES}) exceeds`;
} else {
  detail = `the file count (${files} ≥ ${SOFT_FILES}) exceeds`;
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        `PR size advisory: ${detail} review-quality thresholds ` +
        `(${additions} lines added, ${files} files changed). ` +
        `Consider splitting into smaller, focused PRs. ` +
        `Soft advisory only — calibrated against kibana May–Jul 2026 data.`,
    },
  })
);
