/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** What one build's runs of a test in one setup add up to, across the job's attempts. */
export interface BuildRun {
  build: number;
  buildUrl?: string;
  commit?: string;
  /** When the build last reported the test. */
  lastAt: Date;
  passed: number;
  /** Runs that failed every in-run attempt. */
  failed: number;
  /** Runs that failed, then passed on an in-run retry. */
  recovered: number;
  skipped: number;
  /** Whether a retried job reported the test, so no further attempt is coming. */
  retried: boolean;
}

export type BuildVerdict = 'passed' | 'recovered' | 'failed' | 'pending' | 'skipped';

/**
 * What one build says about the test. A build whose only attempt failed is pending until its
 * retry reports: the retry decides whether the test failed every attempt or recovered.
 */
export const verdictOf = (run: BuildRun): BuildVerdict => {
  if (run.passed > 0) {
    return run.failed > 0 || run.recovered > 0 ? 'recovered' : 'passed';
  }
  if (run.recovered > 0) {
    return 'recovered';
  }
  if (run.failed > 0) {
    return run.retried ? 'failed' : 'pending';
  }
  return 'skipped';
};

export interface ConsistentFailureRule {
  /** Builds in a row, at least one, in which the test failed every attempt. */
  consecutiveBuilds: number;
  /** Runs before those that must all have passed; fewer when the test has not run that often. */
  cleanRunsBefore: number;
}

/**
 * Two builds tell a break from a flaky test, which rarely fails every attempt twice in a row,
 * and a clean history tells it from a test that was already failing now and then.
 */
export const DEFAULT_CONSISTENT_FAILURE_RULE: ConsistentFailureRule = {
  consecutiveBuilds: 2,
  cleanRunsBefore: 20,
};

export interface ConsistentFailure {
  /** The builds of the streak, oldest first. */
  failingBuilds: BuildRun[];
  /** The last build in which the test passed, when it did within the runs given. */
  lastPassingBuild?: BuildRun;
}

/**
 * Whether the test's runs in one setup end in a consistent failure: its latest settled builds
 * all failed every attempt and the runs before them all passed. Builds still awaiting a retry at
 * the end are left out of the picture; one in the middle of the streak breaks it until its retry
 * reports. A skipped build breaks the streak too, as the test was dealt with.
 */
export const findConsistentFailure = (
  runs: readonly BuildRun[],
  rule: ConsistentFailureRule = DEFAULT_CONSISTENT_FAILURE_RULE
): ConsistentFailure | undefined => {
  const verdicts = [...runs]
    .sort((a, b) => a.build - b.build)
    .map((run) => ({ run, verdict: verdictOf(run) }));

  let settledCount = verdicts.length;
  while (settledCount > 0 && verdicts[settledCount - 1].verdict === 'pending') {
    settledCount--;
  }
  const settled = verdicts.slice(0, settledCount);

  const streak = settled.slice(-rule.consecutiveBuilds);
  if (
    streak.length < rule.consecutiveBuilds ||
    streak.some(({ verdict }) => verdict !== 'failed')
  ) {
    return undefined;
  }

  const history = settled
    .slice(0, -rule.consecutiveBuilds)
    .filter(({ verdict }) => verdict !== 'skipped');
  const before = history.slice(Math.max(0, history.length - rule.cleanRunsBefore));
  if (before.some(({ verdict }) => verdict !== 'passed')) {
    return undefined;
  }

  return {
    failingBuilds: streak.map(({ run }) => run),
    lastPassingBuild: history.findLast(({ verdict }) => verdict === 'passed')?.run,
  };
};
