/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { formatExecutionTriggerLabel } from './format_execution_table_values';

export const EXECUTIONS_GROUP_BY_VALUES = ['none', 'workflow', 'status', 'trigger'] as const;

export type ExecutionsGroupBy = (typeof EXECUTIONS_GROUP_BY_VALUES)[number];

export interface ExecutionsGroupBucket {
  key: string;
  label: string;
  executions: WorkflowExecutionListItemDto[];
}

export const getExecutionsGroupByLabel = (value: ExecutionsGroupBy): string => {
  switch (value) {
    case 'workflow':
      return i18n.translate('workflowsManagement.executionsPage.table.groupBy.workflow', {
        defaultMessage: 'Workflow',
      });
    case 'status':
      return i18n.translate('workflowsManagement.executionsPage.table.groupBy.status', {
        defaultMessage: 'Status',
      });
    case 'trigger':
      return i18n.translate('workflowsManagement.executionsPage.table.groupBy.trigger', {
        defaultMessage: 'Trigger',
      });
    case 'none':
    default:
      return i18n.translate('workflowsManagement.executionsPage.table.groupBy.none', {
        defaultMessage: 'None',
      });
  }
};

const getGroupKey = (
  execution: WorkflowExecutionListItemDto,
  groupBy: Exclude<ExecutionsGroupBy, 'none'>
): { key: string; label: string } => {
  switch (groupBy) {
    case 'workflow': {
      const label = execution.workflowName ?? execution.workflowId ?? '—';
      return { key: execution.workflowId ?? label, label };
    }
    case 'status': {
      const label = execution.status ?? '—';
      return { key: label, label };
    }
    case 'trigger': {
      const label = formatExecutionTriggerLabel(execution.triggeredBy) ?? '—';
      return { key: execution.triggeredBy ?? label, label };
    }
    default:
      return { key: '—', label: '—' };
  }
};

/**
 * Client-side grouping over the currently loaded page of executions.
 * TODO: server-side aggregation for correct counts across the full result set.
 */
export const groupExecutions = (
  executions: WorkflowExecutionListItemDto[],
  groupBy: ExecutionsGroupBy
): ExecutionsGroupBucket[] => {
  if (groupBy === 'none') {
    return [];
  }

  const buckets = new Map<string, ExecutionsGroupBucket>();

  for (const execution of executions) {
    const { key, label } = getGroupKey(execution, groupBy);
    const existing = buckets.get(key);
    if (existing) {
      existing.executions.push(execution);
    } else {
      buckets.set(key, { key, label, executions: [execution] });
    }
  }

  return [...buckets.values()].sort((a, b) => b.executions.length - a.executions.length);
};
