/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { qualifyBranch, qualifyTest } from './qualification';
import { DEFAULT_FLAKY_TEST_REPORT_OPTIONS } from './schema';
import type { BranchRuns } from './queries';

const now = new Date('2026-10-02T12:00:00Z');
const thresholds = DEFAULT_FLAKY_TEST_REPORT_OPTIONS.thresholds;
const context = (pattern: string, hoursBetween = 1): BranchRuns => ({
  pipeline: 'cloud',
  branch: 'main',
  configPath: 'config.ts',
  targetMode: 'serverless-search',
  targetType: 'cloud',
  runs: [...pattern].map((status, index) => ({
    build: index + 1,
    timestamp: new Date(now.getTime() - (pattern.length - index) * hoursBetween * 3_600_000),
    failed: status !== 'P',
    hard: status === 'F',
    suspectedIncident: false,
  })),
});

it.each([
  ['FPF', 'flaky', 'separate-episodes'],
  ['RR', 'flaky', 'repeated-retry-recovery'],
  ['RRRR', 'flaky', 'repeated-retry-recovery'],
  ['FF', 'consistently-failing', 'consecutive-terminal-failures'],
  ['FFF', 'consistently-failing', 'consecutive-terminal-failures'],
])('qualifies %s with its evidence reason', (pattern, classification, reason) => {
  expect(qualifyBranch(context(pattern), thresholds, now, 28)).toMatchObject({
    classification,
    reasons: [reason],
    freshFailure: true,
  });
});

it('respects a configurable terminal-failure threshold', () => {
  expect(
    qualifyBranch(context('FF'), { ...thresholds, minConsecutiveFailures: 3 }, now, 28)
  ).toBeUndefined();
});

it('does not make one isolated failure, or a resolved terminal streak, a recurring flake', () => {
  expect(qualifyBranch(context('FPP'), thresholds, now, 28)).toBeUndefined();
  expect(qualifyBranch(context('FFFFPP'), thresholds, now, 28)).toBeUndefined();
});

it('counts historical episodes beyond the recent 200-build cap', () => {
  const history = context(`F${'P'.repeat(201)}F${'P'.repeat(201)}F`);
  const result = qualifyBranch(history, thresholds, now, 28);
  expect(result).toMatchObject({
    classification: 'flaky',
    reasons: ['historical-recurrence'],
    windowDays: 28,
    recentEpisodes: 1,
    historicalEpisodes: 3,
    historicalFailureDays: 3,
    flakiestBranch: { builds: 405, failedBuilds: 3 },
    freshFailure: true,
  });
});

it('uses all 28 days for recurrence when only one episode is in the recent window', () => {
  const history = context('FPFPF');
  history.runs.forEach((run, index) => {
    run.timestamp = new Date(now.getTime() - [27, 26, 18, 17, 1][index] * 86_400_000);
  });
  expect(qualifyBranch(history, thresholds, now, 28)).toMatchObject({
    reasons: ['historical-recurrence'],
    recentEpisodes: 1,
    historicalFailureDays: 3,
    freshFailure: true,
  });
});

it('does not qualify a historical cluster confined to one day', () => {
  const history = context(`FPFPF${'P'.repeat(201)}`, 0.05);
  expect(qualifyBranch(history, thresholds, now, 28)).toBeUndefined();
});

it('marks old evidence as stale without deleting the qualification', () => {
  const history = context('FPF' + 'P'.repeat(100));
  expect(qualifyBranch(history, thresholds, now, 28)).toMatchObject({
    classification: 'flaky',
    freshFailure: false,
  });
});

it('measures freshness from the actual failure, not a later passing rerun in the same build', () => {
  const history = context('RR');
  for (const run of history.runs) run.lastFailedAt = new Date(now.getTime() - 48 * 3_600_000);
  expect(qualifyBranch(history, thresholds, now, 28)?.freshFailure).toBe(false);
});

it('retains persistent and intermittent contexts of the same test independently', () => {
  const broken = context('FFF');
  const clean = { ...context('PPP'), targetMode: 'stateful-classic' };
  const flaky = { ...context('RR'), pipeline: 'on-merge' };
  expect(qualifyTest([broken, clean, flaky], thresholds, now, 28)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        classification: 'consistently-failing',
        flakiestBranch: expect.objectContaining({ targetMode: 'serverless-search' }),
      }),
      expect.objectContaining({
        classification: 'flaky',
        flakiestBranch: expect.objectContaining({ pipeline: 'on-merge' }),
      }),
    ])
  );
  expect(qualifyTest([broken, clean, flaky], thresholds, now, 28)).toHaveLength(2);
});

it('retains urgent evidence from suspected incidents and flags it for consumers', () => {
  const history = context('FF');
  for (const run of history.runs) run.suspectedIncident = true;
  expect(qualifyBranch(history, thresholds, now, 28)).toMatchObject({
    classification: 'consistently-failing',
    suspectedIncidentBuilds: 2,
  });
});
