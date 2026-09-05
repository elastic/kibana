#!/usr/bin/env node
// PR size advisory — warns when additions or changed files exceed review-quality
// thresholds. Calibrated against kibana May-Jul 2026 data (n=5,477 PRs, backports
// excluded). Soft-limit only: never blocks, just adds context.

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const parseEnvInt = (name, fallback) => {
  const n = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const SOFT_LINES = parseEnvInt('PR_SIZE_SOFT_LINES', 500);
const SOFT_FILES = parseEnvInt('PR_SIZE_SOFT_FILES', 15);
const DEBOUNCE_SECS = parseEnvInt('PR_SIZE_DEBOUNCE_SECS', 30);

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

// Debounce: skip if the check ran recently for this project.
const debounceKey = createHash('md5').update(projectDir).digest('hex').slice(0, 8);
const debounceFile = join(tmpdir(), `pr-size-guard-${debounceKey}`);
const nowSecs = Math.floor(Date.now() / 1000);
if (existsSync(debounceFile)) {
  const last = Number(readFileSync(debounceFile, 'utf8').trim()) || 0;
  if (nowSecs - last < DEBOUNCE_SECS) process.exit(0);
}
const debounceTmp = `${debounceFile}.tmp.${process.pid}`;
writeFileSync(debounceTmp, String(nowSecs));
renameSync(debounceTmp, debounceFile);

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

// Merge-base is cached per repo in a single JSON file keyed by projectDir hash,
// preventing cross-repo collisions (e.g. forks sharing a SHA pair on one machine)
// and bounding tmp-dir growth to one file per repo.
const cacheFile = join(tmpdir(), `pr-size-mergebase-${debounceKey}`);

let mergeBase;
try {
  const cached = JSON.parse(readFileSync(cacheFile, 'utf8'));
  if (cached.head === headSha && cached.origin === originSha) mergeBase = cached.base;
} catch { /* cache miss */ }

if (!mergeBase) {
  mergeBase = git('merge-base', 'HEAD', `origin/${defaultBranch}`);
  if (!mergeBase) process.exit(0);
  const cacheTmp = `${cacheFile}.tmp.${process.pid}`;
  writeFileSync(cacheTmp, JSON.stringify({ head: headSha, origin: originSha, base: mergeBase }));
  renameSync(cacheTmp, cacheFile);
}

// Count additions and changed files (additions only — deletions don't penalise refactors).
// Binary files (shown as '-' in --numstat) count toward the file total but not additions.
const diffOut = git('diff', '--numstat', mergeBase, 'HEAD');
if (!diffOut) process.exit(0);

let additions = 0;
let files = 0;
for (const line of diffOut.split('\n')) {
  if (!line.trim()) continue;
  const [added] = line.split('\t');
  files += 1;
  if (added === '-') continue; // binary: count file but skip additions
  additions += Number(added) || 0;
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
  }) + '\n'
);
