/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ChangeHistoryChangesSummaryRenderFn } from '@kbn/change-history-ui';

import {
  WorkflowChangeHistoryItemChangesSummary,
  type WorkflowChangeSummaryGroup,
} from './workflow_change_history_item_changes_summary';

const isWorkflowChangeSummaryGroup = (group: unknown): group is WorkflowChangeSummaryGroup => {
  if (typeof group !== 'object' || group == null) {
    return false;
  }

  const { title, lines } = group as WorkflowChangeSummaryGroup;

  return (
    typeof title === 'string' &&
    Array.isArray(lines) &&
    lines.every((line: unknown) => typeof line === 'string')
  );
};

const isWorkflowChangeSummaryGroups = (summary: unknown): summary is WorkflowChangeSummaryGroup[] =>
  Array.isArray(summary) && summary.every(isWorkflowChangeSummaryGroup);

export const renderWorkflowChangeHistoryChangesSummary: ChangeHistoryChangesSummaryRenderFn = ({
  summary,
}) => {
  if (!isWorkflowChangeSummaryGroups(summary)) {
    return null;
  }

  return <WorkflowChangeHistoryItemChangesSummary groups={summary} />;
};
