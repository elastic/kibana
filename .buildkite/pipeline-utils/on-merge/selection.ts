/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const ON_MERGE_SELECTION_METADATA_KEY = 'on-merge-selection';

const ON_MERGE_SELECTIVE_MODES = ['off', 'shadow'] as const;
export type OnMergeSelectiveMode = (typeof ON_MERGE_SELECTIVE_MODES)[number];

export const ON_MERGE_TEST_TYPES = ['scout', 'jestUnit', 'jestIntegration', 'ftr'] as const;
export type OnMergeTestType = (typeof ON_MERGE_TEST_TYPES)[number];

export type OnMergeTestTypeDecision = { mode: 'selective' } | { mode: 'full'; reason: string };

/** Commit range covered by an on-merge build and, per test type, whether tests may be selected from it. */
export interface OnMergeSelection {
  commit: string;
  base: string | null;
  baseSource: 'github-activity' | 'merge-queue' | null;
  commitCount: number | null;
  testTypes: Record<OnMergeTestType, OnMergeTestTypeDecision>;
}

/**
 * Parses `ON_MERGE_SELECTIVE_MODE`; unset or unrecognised means `off`. Values must match exactly,
 * as Pre-Build and the Scout builder compare them in bash.
 *
 * Falls back rather than throwing: this is read from `loadRunOrderConfig()` in the
 * "Pick Test Group Run Order" step, which exits non-zero on any error. A typo in the
 * variable must disable the shadow run, not fail the build.
 */
export const parseOnMergeSelectiveMode = (raw: string | undefined): OnMergeSelectiveMode => {
  const value = raw || 'off';
  if (!(ON_MERGE_SELECTIVE_MODES as readonly string[]).includes(value)) {
    console.error(
      `Ignoring invalid ON_MERGE_SELECTIVE_MODE: ${raw}. Valid values: ${ON_MERGE_SELECTIVE_MODES.join(
        ', '
      )}. Falling back to 'off'.`
    );
    return 'off';
  }
  return value as OnMergeSelectiveMode;
};

/** Selection where every test type runs in full for the same reason. */
export const fullSelection = (commit: string, reason: string): OnMergeSelection => ({
  commit,
  base: null,
  baseSource: null,
  commitCount: null,
  testTypes: {
    scout: { mode: 'full', reason },
    jestUnit: { mode: 'full', reason },
    jestIntegration: { mode: 'full', reason },
    ftr: { mode: 'full', reason },
  },
});

/**
 * Parses the meta-data value; returns null when it is missing or not valid JSON.
 *
 * The shape is not validated: Pre-Build writes it from a typed `OnMergeSelection` in the same
 * build and commit, so readers can never see a different schema.
 */
export const parseOnMergeSelection = (raw: string | null): OnMergeSelection | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnMergeSelection;
  } catch {
    return null;
  }
};
