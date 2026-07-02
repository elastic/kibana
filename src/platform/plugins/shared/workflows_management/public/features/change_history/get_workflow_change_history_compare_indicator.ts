/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeHistoryCompareSpec, ChangeHistoryDetail } from '@kbn/change-history-ui';

export interface WorkflowChangeHistoryCompareIndicator {
  baselineVersion?: number;
  currentVersion?: number;
}

const getVersionNumber = (change: ChangeHistoryDetail): number | undefined => {
  const version = change.metadata?.version;
  return typeof version === 'number' ? version : undefined;
};

/** Baseline = older side; target = newer side. */
export const getWorkflowChangeHistoryCompareIndicator = (
  compareSpec: ChangeHistoryCompareSpec
): WorkflowChangeHistoryCompareIndicator => ({
  baselineVersion: getVersionNumber(compareSpec.baseline),
  currentVersion: getVersionNumber(compareSpec.target),
});
