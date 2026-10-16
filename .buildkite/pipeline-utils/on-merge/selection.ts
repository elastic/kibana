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

export const ON_MERGE_SUITES = ['scout', 'jestUnit', 'jestIntegration', 'ftr'] as const;
export type OnMergeSuite = (typeof ON_MERGE_SUITES)[number];

export type OnMergeSuiteDecision = { mode: 'selective' } | { mode: 'full'; reason: string };

/** Commit range covered by an on-merge build and, per suite, whether tests may be selected from it. */
export interface OnMergeSelection {
  commit: string;
  base: string | null;
  baseSource: 'github-activity' | 'merge-queue' | 'direct-push' | null;
  commitCount: number | null;
  suites: Record<OnMergeSuite, OnMergeSuiteDecision>;
}

/** Parses `ON_MERGE_SELECTIVE_MODE`; unset means `off`. */
export const parseOnMergeSelectiveMode = (raw: string | undefined): OnMergeSelectiveMode => {
  const value = raw?.trim().toLowerCase() || 'off';
  if (!(ON_MERGE_SELECTIVE_MODES as readonly string[]).includes(value)) {
    throw new Error(
      `invalid ON_MERGE_SELECTIVE_MODE: ${raw}. Valid values: ${ON_MERGE_SELECTIVE_MODES.join(
        ', '
      )}`
    );
  }
  return value as OnMergeSelectiveMode;
};

/** Selection where every suite runs in full for the same reason. */
export const fullSelection = (commit: string, reason: string): OnMergeSelection => ({
  commit,
  base: null,
  baseSource: null,
  commitCount: null,
  suites: {
    scout: { mode: 'full', reason },
    jestUnit: { mode: 'full', reason },
    jestIntegration: { mode: 'full', reason },
    ftr: { mode: 'full', reason },
  },
});

const isSuiteDecision = (decision: OnMergeSuiteDecision | undefined): boolean =>
  decision?.mode === 'selective' ||
  (decision?.mode === 'full' && typeof decision.reason === 'string');

/** Parses the meta-data value; returns null for missing or malformed input. */
export const parseOnMergeSelection = (raw: string | null): OnMergeSelection | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const isValid =
      typeof parsed?.commit === 'string' &&
      ON_MERGE_SUITES.every((suite) => isSuiteDecision(parsed.suites?.[suite]));
    return isValid ? parsed : null;
  } catch {
    return null;
  }
};
