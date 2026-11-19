/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { scopeKey, type JudgedScope } from './judged_scope';

/** One build of a test in one setup. */
export interface SetupBuild {
  /** Unique across pipelines, unlike the build number. */
  buildId: string;
  buildNumber: number;
  /** Whether the test failed in the build, a failure that passed on a retry included. */
  failed: boolean;
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

/** Failed builds in a row, one after the other in a setup, too many to be chance. */
export interface Breakage extends JudgedScope {
  setup: string;
  builds: SetupBuild[];
  /** Whether it runs up to the newest build of the setup: the test is broken right now. */
  ongoing: boolean;
}

/** A breakage is at least this many failed builds in a row. */
export const MIN_BREAKAGE_BUILDS = 3;

/** The most likely a run of failed builds may be, for a test failing at random, to be a breakage. */
export const MAX_BREAKAGE_CHANCE = 0.01;

/**
 * The chance that a test failing a share `rate` of its `builds` builds at random, each build
 * independent of the others, fails `length` of them in a row somewhere. A run starts at the first
 * build or after one of the passing builds, so this sums the chance over those starting points.
 */
export const chanceOfFailingInARow = (builds: number, rate: number, length: number): number =>
  Math.min(1, (builds * (1 - rate) + 1) * rate ** length);

/**
 * The breakages in a test's builds in one setup: runs of at least `MIN_BREAKAGE_BUILDS` failed
 * builds that a test failing at random as often would show less than `MAX_BREAKAGE_CHANCE` of
 * the time. A test that failed in every build is broken whatever the chance.
 */
export const findBreakages = ({ branch, pipeline, setup, builds }: SetupBuilds): Breakage[] => {
  const rate = builds.filter((build) => build.failed).length / builds.length;
  const breakages: Breakage[] = [];
  let start = 0;
  while (start < builds.length) {
    let end = start;
    while (end < builds.length && builds[end].failed) {
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

/** `12 failed builds in a row on main (#113410 to #113421) in kibana-on-merge a.config.ts …` */
export const describeBreakage = ({ branch, setup, builds }: Breakage): string =>
  `${builds.length} failed builds in a row on ${branch} (#${builds[0].buildNumber} to ` +
  `#${builds[builds.length - 1].buildNumber}) in ${setup}`;
