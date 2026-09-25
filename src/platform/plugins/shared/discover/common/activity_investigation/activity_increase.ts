/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const ACTIVITY_INCREASE_KINDS = ['spike', 'step_change', 'trend_change'] as const;

export const ACTIVITY_INCREASE_SELECTION_CONFIG = {
  minRelativeIncrease: 0.2,
  maxResults: 10,
} as const;

export interface ActivityBucket {
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly count: number;
}

export interface ActivityIncrease {
  readonly kind: (typeof ACTIVITY_INCREASE_KINDS)[number];
  readonly pvalue: number;
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly intervalMs: number;
  readonly bucketCount: number;
  readonly baseline: number;
  readonly observedMean: number;
  readonly observedTotal: number;
  readonly excess: number;
  readonly percentageChange: number | null;
  readonly referenceTimeRange?: {
    readonly startTimeMs: number;
    readonly endTimeMs: number;
  };
}

/** Applies the display threshold without changing Elasticsearch's change point decisions. */
export const passesActivityIncreaseFilter = (
  { observedMean, baseline }: ActivityIncrease,
  minRelativeIncrease: number = ACTIVITY_INCREASE_SELECTION_CONFIG.minRelativeIncrease
): boolean => observedMean - baseline > baseline * minRelativeIncrease;

/** Orders increases by excess count, then duration and recency. */
export const compareActivityIncreases = (left: ActivityIncrease, right: ActivityIncrease): number =>
  right.excess - left.excess ||
  right.bucketCount - left.bucketCount ||
  right.endTimeMs - left.endTimeMs;
