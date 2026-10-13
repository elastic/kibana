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

/**
 * Fixed widths for predictable columns so Workflow can absorb leftover space.
 * Restored to the pre-tightening 250px spacing for a roomier table layout.
 */
export const EXECUTIONS_TABLE_COLUMN_WIDTH_TAGS = 250;
export const EXECUTIONS_TABLE_COLUMN_WIDTH_TRIGGER = 250;
export const EXECUTIONS_TABLE_COLUMN_WIDTH_STARTED = 250;
export const EXECUTIONS_TABLE_COLUMN_WIDTH_DURATION = 250;

/** Floor width so fixed columns + Actions + a usable Workflow column (~200px) still fit; below this we scroll. */
export const EXECUTIONS_TABLE_MIN_WIDTH_PX = 1300;

export interface WorkflowExecutionsGridColumnSettings {
  display: string;
  isResizable?: boolean;
  initialWidth?: number;
  schema?: EuiDataGridColumn['schema'];
}

export const WORKFLOW_EXECUTIONS_TABLE_COLUMN_SETTINGS: Record<
  WorkflowExecutionsTableColumnId,
  WorkflowExecutionsGridColumnSettings
> = {
  workflow: {
    display: i18n.translate('workflowsManagement.executionsPage.column.workflow', {
      defaultMessage: 'Workflow',
    }),
    isResizable: false,
  },
  tags: {
    display: i18n.translate('workflowsManagement.executionsPage.column.tags', {
      defaultMessage: 'Tags',
    }),
    initialWidth: EXECUTIONS_TABLE_COLUMN_WIDTH_TAGS,
  },
  triggers: {
    display: i18n.translate('workflowsManagement.executionsPage.column.trigger', {
      defaultMessage: 'Trigger',
    }),
    initialWidth: EXECUTIONS_TABLE_COLUMN_WIDTH_TRIGGER,
  },
  startedAt: {
    display: i18n.translate('workflowsManagement.executionsPage.column.started', {
      defaultMessage: 'Started',
    }),
    initialWidth: EXECUTIONS_TABLE_COLUMN_WIDTH_STARTED,
  },
  duration: {
    display: i18n.translate('workflowsManagement.executionsPage.column.duration', {
      defaultMessage: 'Duration',
    }),
    initialWidth: EXECUTIONS_TABLE_COLUMN_WIDTH_DURATION,
    schema: 'numeric',
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
      initialWidth: columnWidths[columnId] ?? settings.initialWidth,
      isResizable: settings.isResizable,
      schema: settings.schema,
    };

    return column;
  });

export interface WorkflowExecutionsGridCellContext {
  executions: WorkflowExecutionListItemDto[];
  onOpenExecution: (execution: WorkflowExecutionListItemDto) => void;
}
