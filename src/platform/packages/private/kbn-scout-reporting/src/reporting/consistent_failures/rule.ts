/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MIN_BREAKAGE_BUILDS } from '../flaky_tests/breakages';

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
  /**
   * Whether the job's last allowed attempt reported the test. A failure no retry has reported on
   * is pending, and a pending build does not count.
   */
  settled: boolean;
}

export type BuildVerdict = 'passed' | 'recovered' | 'failed' | 'pending' | 'skipped';

/**
 * What one build says about the test. A build in which the test has only failed so far is
 * pending until it settles: a retry may still decide whether it failed every attempt or
 * recovered, and a build that never settles is left out rather than counted either way.
 */
export const verdictOf = (run: BuildRun): BuildVerdict => {
  if (run.passed > 0) {
    return run.failed > 0 || run.recovered > 0 ? 'recovered' : 'passed';
  }
  if (run.recovered > 0) {
    return 'recovered';
  }
  if (run.failed > 0) {
    return run.settled ? 'failed' : 'pending';
  }
  return 'skipped';
};

export interface ConsistentFailureRule {
  /** Builds in a row, at least one, in which the test failed every attempt. */
  consecutiveBuilds: number;
  /**
   * Runs before those, none of which may have failed every attempt, and all of which must have
   * passed for `consecutiveBuilds` to do; fewer when the test has not run that often.
   */
  cleanRunsBefore: number;
  /** Builds in a row needed instead when some of those runs only passed on a retry. */
  consecutiveBuildsAfterRecoveries: number;
}

/**
 * Two builds tell a break from a flaky test, which rarely fails every attempt twice in a row,
 * and a clean history tells it from a test that was already failing every attempt now and then.
 * A test that only recovered on retries before is flaky, so its break needs as many builds as the
 * daily flaky report takes for a breakage: that report leaves the test to this check from then on.
 */
export const DEFAULT_CONSISTENT_FAILURE_RULE: ConsistentFailureRule = {
  consecutiveBuilds: 2,
  cleanRunsBefore: 20,
  consecutiveBuildsAfterRecoveries: MIN_BREAKAGE_BUILDS,
};

export interface ConsistentFailure {
  /** The builds of the streak, oldest first. */
  failingBuilds: BuildRun[];
  /** The last build the test passed in, on a retry included, when it did within the runs given. */
  lastPassingBuild?: BuildRun;
}

/**
 * Finds a break in a test's runs in one setup: the latest builds all failed every attempt, and
 * the test passed in the builds before.
 *
 * Builds are sorted oldest first and each gets a verdict. Pending builds, a failure no retry has
 * reported on, are left out: they neither count as failures nor break the clean history. The
 * latest builds that are `failed`, back to the first one that is not, form the streak; it must
 * be at least `consecutiveBuilds` long. None of the `cleanRunsBefore` builds before the streak,
 * skipped builds left out, may be `failed`, and when some are `recovered` the streak must be
 * `consecutiveBuildsAfterRecoveries` long instead; fewer builds are fine, so a new test can break
 * too.
 *
 * The same break is found again on every later build while it lasts; callers tell a new break
 * from a known one by the issue they filed.
 */
export const findConsistentFailure = (
  runs: readonly BuildRun[],
  rule: ConsistentFailureRule = DEFAULT_CONSISTENT_FAILURE_RULE
): ConsistentFailure | undefined => {
  // a build with a failure but no final result yet counts neither way
  const verdicts = [...runs]
    .sort((a, b) => a.build - b.build)
    .map((run) => ({ run, verdict: verdictOf(run) }))
    .filter(({ verdict }) => verdict !== 'pending');

  // walk back over the failed builds: that is the streak
  let start = verdicts.length;
  while (start > 0 && verdicts[start - 1].verdict === 'failed') {
    start--;
  }
  const streak = verdicts.slice(start);
  if (streak.length < rule.consecutiveBuilds) {
    return undefined;
  }

  // the builds before the streak must not have failed every attempt, and a test that only
  // recovered on a retry in some of them needs a longer streak
  const history = verdicts.slice(0, start).filter(({ verdict }) => verdict !== 'skipped');
  const before = history.slice(Math.max(0, history.length - rule.cleanRunsBefore));
  if (before.some(({ verdict }) => verdict === 'failed')) {
    return undefined;
  }
  const recovered = before.some(({ verdict }) => verdict === 'recovered');
  if (recovered && streak.length < rule.consecutiveBuildsAfterRecoveries) {
    return undefined;
  }

  return {
    failingBuilds: streak.map(({ run }) => run),
    lastPassingBuild: history.findLast(
      ({ verdict }) => verdict === 'passed' || verdict === 'recovered'
    )?.run,
  };
};
