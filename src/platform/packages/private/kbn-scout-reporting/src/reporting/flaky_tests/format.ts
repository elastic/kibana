/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlakyTestBranchStats, FlakyTestEntry } from './schema';

/** Coarse relative age such as `5m ago`, `3h ago` or `2d ago`. */
export const formatAge = (from: Date, to: Date): string => {
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / (24 * 60))}d ago`;
};

/** `0.096` becomes `9.6%`. */
export const formatRate = (rate: number): string => `${(rate * 100).toFixed(1)}%`;

/**
 * Branch with the highest build failure rate. Branches with fewer builds than `minBuilds` only
 * count when no branch has enough, so one failure on a barely exercised branch does not win.
 */
export const flakiestBranch = (
  byBranch: FlakyTestEntry['byBranch'],
  minBuilds: number
): FlakyTestBranchStats | undefined => {
  const exercised = byBranch.filter((stats) => stats.builds >= minBuilds);
  return [...(exercised.length > 0 ? exercised : byBranch)].sort(
    (a, b) => b.buildFailRate - a.buildFailRate
  )[0];
};
