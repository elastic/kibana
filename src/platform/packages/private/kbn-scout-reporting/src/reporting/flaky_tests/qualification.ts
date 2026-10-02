/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BranchRun, BranchRuns } from './queries';
import type { FlakyTestQualification, FlakyTestReportThresholds } from './schema';

export type Qualification = FlakyTestQualification;

/** Counts failed stretches separated by a clean build. */
export const countEpisodes = (runs: readonly BranchRun[]): number =>
  runs.filter((run, index) => run.failed && !runs[index - 1]?.failed).length;

/** Counts the consecutive terminal failures at the end of the execution history. */
export const countTrailingHardFailures = (runs: readonly BranchRun[]): number =>
  runs.length - 1 - runs.map((run) => run.hard).lastIndexOf(false);

/** Qualifies one execution context while preserving fresh, historical and incident evidence. */
export const qualifyBranch = (
  { pipeline, branch, configPath, targetMode, targetType, runs: allRuns }: BranchRuns,
  thresholds: FlakyTestReportThresholds,
  now: Date,
  lookbackDays: number
): Qualification | undefined => {
  const recentFrom = now.getTime() - thresholds.recentDays * 86_400_000;
  const runs = allRuns
    .filter((run) => run.timestamp.getTime() >= recentFrom)
    .slice(-thresholds.maxRuns);
  const recentEpisodes = countEpisodes(runs);
  const retryRecoveredBuilds = runs.filter((run) => run.failed && !run.hard).length;
  const trailingHardFailures = countTrailingHardFailures(runs);
  const historicalEpisodes = countEpisodes(allRuns);
  const historicalFailureDays = new Set(
    allRuns
      .filter((run, index) => run.failed && !allRuns[index - 1]?.failed)
      .map((run) => (run.lastFailedAt ?? run.timestamp).toISOString().slice(0, 10))
  ).size;
  const latestExecution = allRuns.at(-1);
  const latestFailure = allRuns
    .filter((run) => run.failed)
    .map((run) => run.lastFailedAt ?? run.timestamp)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  if (!latestExecution || !latestFailure) return undefined;

  const reasons: Qualification['reasons'] = [];
  const classification =
    trailingHardFailures >= thresholds.minConsecutiveFailures ? 'consistently-failing' : 'flaky';
  if (classification === 'consistently-failing') {
    reasons.push('consecutive-terminal-failures');
  } else {
    if (recentEpisodes >= thresholds.minEpisodes) reasons.push('separate-episodes');
    if (retryRecoveredBuilds >= thresholds.minRetryRecoveries)
      reasons.push('repeated-retry-recovery');
    if (
      historicalEpisodes >= thresholds.minHistoricalEpisodes &&
      historicalFailureDays >= thresholds.minHistoricalFailureDays
    )
      reasons.push('historical-recurrence');
  }
  if (reasons.length === 0) return undefined;

  const historicalOnly = reasons.every((reason) => reason === 'historical-recurrence');
  const evidence = historicalOnly ? allRuns : runs;
  const failedBuilds = evidence.filter((run) => run.failed).length;
  return {
    classification,
    flakiestBranch: {
      pipeline,
      branch,
      configPath,
      targetMode,
      targetType,
      builds: evidence.length,
      failedBuilds,
      buildFailRate: failedBuilds / evidence.length,
      episodes: countEpisodes(evidence),
    },
    reasons,
    windowDays: historicalOnly ? lookbackDays : Math.min(lookbackDays, thresholds.recentDays),
    recentEpisodes,
    retryRecoveredBuilds,
    trailingHardFailures,
    historicalEpisodes,
    historicalFailureDays,
    lastFailedAt: latestFailure,
    latestExecutionAt: latestExecution.timestamp,
    freshFailure:
      now.getTime() - latestFailure.getTime() <= thresholds.freshFailureHours * 3_600_000,
    suspectedIncidentBuilds: evidence.filter((run) => run.failed && run.suspectedIncident).length,
  };
};

/** Retains every qualifying context, including persistent failures alongside flakiness elsewhere. */
export const qualifyTest = (
  contexts: readonly BranchRuns[],
  thresholds: FlakyTestReportThresholds,
  now: Date,
  lookbackDays: number
): Qualification[] =>
  contexts
    .flatMap((context) => qualifyBranch(context, thresholds, now, lookbackDays) ?? [])
    .sort(
      (a, b) =>
        Number(b.freshFailure) - Number(a.freshFailure) ||
        b.flakiestBranch.failedBuilds - a.flakiestBranch.failedBuilds ||
        b.lastFailedAt.getTime() - a.lastFailedAt.getTime()
    );
