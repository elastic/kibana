/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridColumn, EuiDataGridProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';

export const DEFAULT_WORKFLOW_EXECUTIONS_TABLE_COLUMNS = [
  'workflow',
  'tags',
  'triggers',
  'startedAt',
  'duration',
] as const;

export type WorkflowExecutionsTableColumnId =
  (typeof DEFAULT_WORKFLOW_EXECUTIONS_TABLE_COLUMNS)[number];

export interface WorkflowExecutionsGridColumnSettings {
  display: string;
  width?: number;
}

export const WORKFLOW_EXECUTIONS_TABLE_COLUMN_SETTINGS: Record<
  WorkflowExecutionsTableColumnId,
  WorkflowExecutionsGridColumnSettings
> = {
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
};

export const WORKFLOW_EXECUTIONS_TABLE_GRID_SETTINGS = {
  columns: WORKFLOW_EXECUTIONS_TABLE_COLUMN_SETTINGS,
};

const SORTABLE_COLUMNS = new Set<WorkflowExecutionsTableColumnId>([
  'workflow',
  'triggers',
  'startedAt',
  'duration',
]);

export const buildWorkflowExecutionsGridColumns = (
  columnWidths: Partial<Record<string, number>>
): EuiDataGridProps['columns'] =>
  DEFAULT_WORKFLOW_EXECUTIONS_TABLE_COLUMNS.map((columnId) => {
    const settings = WORKFLOW_EXECUTIONS_TABLE_COLUMN_SETTINGS[columnId];
    const column: EuiDataGridColumn = {
      id: columnId,
      displayAsText: settings.display,
      isSortable: SORTABLE_COLUMNS.has(columnId),
      initialWidth: columnWidths[columnId] ?? settings.width,
    };

    return column;
  });

export interface WorkflowExecutionsGridCellContext {
  executions: WorkflowExecutionListItemDto[];
  onOpenExecution: (execution: WorkflowExecutionListItemDto) => void;
  selectedExecutionId?: string;
}
