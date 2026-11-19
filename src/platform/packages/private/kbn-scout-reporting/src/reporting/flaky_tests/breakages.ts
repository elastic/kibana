/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { scopeKey, type JudgedScope } from './judged_scope';

/**
 * How the test did in a build across its attempts: `recovered` when it failed, then passed on a
 * retry, and `failed` when it failed every attempt.
 */
export type BuildOutcome = 'passed' | 'recovered' | 'failed';

/** One build of a test in one setup. */
export interface SetupBuild {
  /** Unique across pipelines, unlike the build number. */
  buildId: string;
  buildNumber: number;
  outcome: BuildOutcome;
  /** When the build first ran the test in the setup. */
  ranAt: Date;
  /** When the test last failed in the build in the setup: a later retry can be well after `ranAt`. */
  failedAt?: Date;
}

/**
 * A test's builds in one setup (pipeline, config file and Scout target) on one branch, oldest
 * first, with the pipeline when it is judged on its own.
 */
export interface SetupBuilds extends JudgedScope {
  setup: string;
  builds: SetupBuild[];
}

/**
 * Builds in a row that the test failed every attempt of, one after the other in a setup, too many
 * to be chance. A build where a retry passed ends the run: the test still works there, it is flaky.
 */
export interface Breakage extends JudgedScope {
  setup: string;
  builds: SetupBuild[];
  /** Whether it runs up to the newest build of the setup: the test is broken right now. */
  ongoing: boolean;
}

/** A breakage is at least this many builds in a row failing every attempt. */
export const MIN_BREAKAGE_BUILDS = 3;

/** The most likely a run of failed builds may be, for a test failing at random, to be a breakage. */
export const MAX_BREAKAGE_CHANCE = 0.01;

/** Whether the test failed every attempt of the build: no retry passed. */
const failedEveryAttempt = ({ outcome }: SetupBuild): boolean => outcome === 'failed';

/**
 * The chance that a test failing a share `rate` of its `builds` builds at random, each build
 * independent of the others, fails `length` of them in a row somewhere. A run starts at the first
 * build or after one of the passing builds, so this sums the chance over those starting points.
 */
export const chanceOfFailingInARow = (builds: number, rate: number, length: number): number =>
  Math.min(1, (builds * (1 - rate) + 1) * rate ** length);

/**
 * The breakages in a test's builds in one setup: runs of at least `MIN_BREAKAGE_BUILDS` builds
 * failing every attempt that a test failing every attempt at random as often would show less than
 * `MAX_BREAKAGE_CHANCE` of the time. A test that failed every attempt of every build is broken
 * whatever the chance. These are the failures the consistently failing check reports.
 */
export const findBreakages = ({ branch, pipeline, setup, builds }: SetupBuilds): Breakage[] => {
  const rate = builds.filter(failedEveryAttempt).length / builds.length;
  const breakages: Breakage[] = [];
  let start = 0;
  while (start < builds.length) {
    let end = start;
    while (end < builds.length && failedEveryAttempt(builds[end])) {
      end += 1;
    }
    const length = end - start;
    if (
      length >= MIN_BREAKAGE_BUILDS &&
      (rate === 1 || chanceOfFailingInARow(builds.length, rate, length) < MAX_BREAKAGE_CHANCE)
    ) {
      breakages.push({
        branch,
        ...(pipeline ? { pipeline } : {}),
        setup,
        builds: builds.slice(start, end),
        ongoing: end === builds.length,
      });
    }
    start = end + 1;
  }
  return breakages;
};

/**
 * How many builds ran a test on a branch, of a pipeline when it is judged on its own, and how many
 * of them failed it.
 */
export interface BranchCounts extends JudgedScope {
  builds: number;
  failedBuilds: number;
}

/**
 * The per-branch counts leaving out the breakages. Every build in a breakage failed the test, so
 * each one is taken off both counts of its branch, once however many setups it broke in. A
 * breakage in a pipeline judged on its own is taken off that pipeline's counts.
 */
export const branchCountsWithout = <T extends BranchCounts>(
  counts: readonly T[],
  breakages: readonly Breakage[]
): T[] => {
  const excludedByScope = new Map<string, Set<string>>();
  for (const breakage of breakages) {
    const key = scopeKey(breakage);
    const excluded = excludedByScope.get(key) ?? new Set();
    for (const { buildId } of breakage.builds) {
      excluded.add(buildId);
    }
    excludedByScope.set(key, excluded);
  }
  return counts.map((row) => {
    const excluded = excludedByScope.get(scopeKey(row))?.size ?? 0;
    return { ...row, builds: row.builds - excluded, failedBuilds: row.failedBuilds - excluded };
  });
};

/** `12 builds in a row failing every attempt on main (#113410 to #113421) in kibana-on-merge …` */
export const describeBreakage = ({ branch, setup, builds }: Breakage): string =>
  `${builds.length} builds in a row failing every attempt on ${branch} ` +
  `(#${builds[0].buildNumber} to #${builds[builds.length - 1].buildNumber}) in ${setup}`;
