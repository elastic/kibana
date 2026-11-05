/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** One build of a test in one setup. */
export interface SetupBuild {
  /** Unique across pipelines, unlike the build number. */
  buildId: string;
  buildNumber: number;
  /** Whether the test failed in the build, a failure that passed on a retry included. */
  failed: boolean;
}

/** A test's builds in one setup (pipeline, config file and Scout target) on one branch, oldest first. */
export interface SetupBuilds {
  branch: string;
  setup: string;
  builds: SetupBuild[];
}

/** Failed builds in a row, one after the other in a setup, too many to be chance. */
export interface Breakage {
  branch: string;
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
export const findBreakages = ({ branch, setup, builds }: SetupBuilds): Breakage[] => {
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
        setup,
        builds: builds.slice(start, end),
        ongoing: end === builds.length,
      });
    }
    start = end + 1;
  }
  return breakages;
};

/** Per branch, how many builds ran the test and how many failed it, leaving out the breakages. */
export const branchCountsWithout = (
  setups: readonly SetupBuilds[],
  breakages: readonly Breakage[]
): Array<{ branch: string; builds: number; failedBuilds: number }> => {
  const excluded = new Set(breakages.flatMap(({ builds }) => builds.map(({ buildId }) => buildId)));
  const byBranch = new Map<string, { builds: Set<string>; failedBuilds: Set<string> }>();
  for (const { branch, builds } of setups) {
    const counts = byBranch.get(branch) ?? { builds: new Set(), failedBuilds: new Set() };
    for (const { buildId, failed } of builds) {
      if (excluded.has(buildId)) continue;
      counts.builds.add(buildId);
      if (failed) {
        counts.failedBuilds.add(buildId);
      }
    }
    byBranch.set(branch, counts);
  }
  return [...byBranch].map(([branch, { builds, failedBuilds }]) => ({
    branch,
    builds: builds.size,
    failedBuilds: failedBuilds.size,
  }));
};

/** `12 failed builds in a row on main (#113410 to #113421) in kibana-on-merge a.config.ts …` */
export const describeBreakage = ({ branch, setup, builds }: Breakage): string =>
  `${builds.length} failed builds in a row on ${branch} (#${builds[0].buildNumber} to ` +
  `#${builds[builds.length - 1].buildNumber}) in ${setup}`;
