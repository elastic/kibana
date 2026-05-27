/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TimingRow {
  name: string;
  calls: number;
  totalMs: number;
  meanMs: number;
  minMs: number;
  maxMs: number;
}

const DOWNLOAD_DIR = 'target/ftr-timing-parts';
const OUT_FILE = 'target/test-metrics/ftr-service-timing-aggregate.ndjson';

const exec = (cmd: string) => execSync(cmd, { stdio: 'inherit' });
const tryExec = (cmd: string) => {
  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
};

mkdirSync(DOWNLOAD_DIR, { recursive: true });
mkdirSync('target/test-metrics', { recursive: true });

// Each test job uploads a file named ftr-service-timing-<job-id>.ndjson so that
// the Buildkite agent can distinguish them (downloading an exact filename fails
// with "Multiple artifacts found" when several jobs emit the same path).
const downloaded = tryExec(
  `.buildkite/scripts/common/download_artifact.sh --include-retried-jobs "target/test-metrics/ftr-service-timing-*.ndjson" "${DOWNLOAD_DIR}"`
);
if (!downloaded) {
  console.log('No ftr-service-timing-*.ndjson artifacts found; skipping aggregation.');
  process.exit(0);
}

const aggregate = new Map<string, Omit<TimingRow, 'name' | 'meanMs'>>();

for (const file of readdirSync(DOWNLOAD_DIR, { recursive: true }) as string[]) {
  if (!file.endsWith('.ndjson')) continue;
  const content = readFileSync(join(DOWNLOAD_DIR, file), 'utf8');
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    const row: TimingRow = JSON.parse(line);
    const existing = aggregate.get(row.name);
    if (existing) {
      existing.calls += row.calls;
      existing.totalMs += row.totalMs;
      existing.minMs = Math.min(existing.minMs, row.minMs);
      existing.maxMs = Math.max(existing.maxMs, row.maxMs);
    } else {
      aggregate.set(row.name, {
        calls: row.calls,
        totalMs: row.totalMs,
        minMs: row.minMs,
        maxMs: row.maxMs,
      });
    }
  }
}

const rows = [...aggregate.entries()]
  .map(([name, s]) => ({
    name,
    calls: s.calls,
    totalMs: s.totalMs,
    meanMs: Math.round(s.totalMs / s.calls),
    minMs: s.minMs,
    maxMs: s.maxMs,
  }))
  .sort((a, b) => b.totalMs - a.totalMs);

writeFileSync(OUT_FILE, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');

console.log(`Aggregated ${aggregate.size} methods from ${rows.length} entries → ${OUT_FILE}`);
exec(`buildkite-agent artifact upload "${OUT_FILE}"`);
