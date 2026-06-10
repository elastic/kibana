/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { DataTableColumnsMeta, DataTableRecord } from '@kbn/discover-utils/types';
import { i18n } from '@kbn/i18n';
import type { CustomCellRenderer, UnifiedDataTableSettings } from '@kbn/unified-data-table';
import {
  WorkflowExecutionDurationCell,
  WorkflowExecutionStartedAtCell,
  WorkflowExecutionTagsCell,
  WorkflowExecutionTriggersCell,
  WorkflowExecutionWorkflowCell,
} from './workflow_executions_table_cells';

export const DEFAULT_WORKFLOW_EXECUTIONS_TABLE_COLUMNS = [
  'workflow',
  'tags',
  'triggers',
  'startedAt',
  'duration',
] as const;

export const WORKFLOW_EXECUTIONS_TABLE_COLUMNS_META: DataTableColumnsMeta = {
  workflow: { type: 'string' },
  tags: { type: 'string' },
  triggers: { type: 'string' },
};

export const WORKFLOW_EXECUTIONS_TABLE_GRID_SETTINGS: UnifiedDataTableSettings = {
  columns: {
    workflow: {
      display: i18n.translate('workflowsManagement.executionsPage.column.workflow', {
        defaultMessage: 'Workflow',
      }),
    },
    tags: {
      display: i18n.translate('workflowsManagement.executionsPage.column.tags', {
        defaultMessage: 'Tags',
      }),
      width: 180,
    },
    triggers: {
      display: i18n.translate('workflowsManagement.executionsPage.column.trigger', {
        defaultMessage: 'Trigger',
      }),
      width: 120,
    },
    startedAt: {
      display: i18n.translate('workflowsManagement.executionsPage.column.started', {
        defaultMessage: 'Started',
      }),
      width: 160,
    },
    duration: {
      display: i18n.translate('workflowsManagement.executionsPage.column.duration', {
        defaultMessage: 'Duration',
      }),
      width: 60,
    },
  },
};

export const useWorkflowExecutionsTableConfig = (
  onOpenExecution: (row: DataTableRecord) => void
) => {
  const externalCustomRenderers = useMemo<CustomCellRenderer>(
    () => ({
      workflow: ({ row }) => <WorkflowExecutionWorkflowCell row={row} onOpen={onOpenExecution} />,
      tags: ({ row }) => <WorkflowExecutionTagsCell row={row} />,
      triggers: ({ row }) => <WorkflowExecutionTriggersCell row={row} />,
      startedAt: ({ row }) => <WorkflowExecutionStartedAtCell row={row} />,
      duration: ({ row }) => <WorkflowExecutionDurationCell row={row} />,
    }),
    [onOpenExecution]
  );

  return {
    externalCustomRenderers,
  };
};
