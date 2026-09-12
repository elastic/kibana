/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeHistoryCompareSpec } from '@kbn/change-history-ui';

import {
  getWorkflowChangeHistoryRowDisplay,
  getWorkflowChangeHistoryVersionNumber,
  type WorkflowChangeHistoryBadgeColor,
} from './get_workflow_change_history_row_display';

export type WorkflowChangeHistoryCompareBadgeColor = WorkflowChangeHistoryBadgeColor;

export interface WorkflowChangeHistoryCompareIndicator {
  baselineVersion?: number;
  currentVersion?: number;
  currentBadgeLabel?: string;
  currentBadgeColor?: WorkflowChangeHistoryCompareBadgeColor;
}

/** Baseline = older side; target = newer / selected side. */
export const getWorkflowChangeHistoryCompareIndicator = (
  compareSpec: ChangeHistoryCompareSpec
): WorkflowChangeHistoryCompareIndicator => {
  const currentVersion = getWorkflowChangeHistoryVersionNumber(compareSpec.target);
  const targetDisplay = getWorkflowChangeHistoryRowDisplay(compareSpec.target);

  return {
    baselineVersion: getWorkflowChangeHistoryVersionNumber(compareSpec.baseline),
    ...(currentVersion != null
      ? { currentVersion }
      : {
          ...(targetDisplay.badgeLabel
            ? {
                currentBadgeLabel: targetDisplay.badgeLabel,
                currentBadgeColor: targetDisplay.badgeColor,
              }
            : {}),
        }),
  };
};
