/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  EuiDataGridProps,
  EuiDataGridSorting,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import { EuiCheckbox, EuiDataGrid, EuiScreenReaderOnly } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import type { RerunWorkflowExecutionParams } from './build_replay_inputs_from_execution_context';
import type { UseWorkflowExecutionsGridSelectionResult } from './use_workflow_executions_grid_selection';
import {
  useWorkflowExecutionsGridContext,
  WorkflowExecutionsGridProvider,
} from './workflow_executions_grid_context';
import type { ExecutionTableSortOrder } from './workflow_executions_page_constants';
import { WorkflowExecutionsSelectionBar } from './workflow_executions_selection_bar';
import { useWorkflowExecutionsTrailingControlColumns } from './workflow_executions_table_actions';
import {
  WorkflowExecutionDurationCell,
  WorkflowExecutionStartedAtCell,
  WorkflowExecutionTagsCell,
  WorkflowExecutionTriggersCell,
  WorkflowExecutionWorkflowCell,
} from './workflow_executions_table_cells';
import {
  buildWorkflowExecutionsGridColumns,
  type WorkflowExecutionsGridCellContext,
} from './workflow_executions_table_config';

const SELECTION_COLUMN_ID = 'selection';
const SELECTION_COLUMN_WIDTH = 36;

const gridStyle = {
  border: 'horizontal' as const,
  header: 'underline' as const,
  stripes: false,
  fontSize: 'm' as const,
  cellPadding: 'm' as const,
};

const SelectionHeaderCell = () => {
  const { getVisibleSelectionState, selectAllVisibleExecutions, deselectVisibleExecutions } =
    useWorkflowExecutionsGridContext();

  const { areAllVisibleSelected, isIndeterminate } = getVisibleSelectionState();

  const title =
    isIndeterminate || areAllVisibleSelected
      ? i18n.translate('workflowsManagement.executionsPage.grid.deselectAllRows', {
          defaultMessage: 'Deselect all visible rows',
        })
      : i18n.translate('workflowsManagement.executionsPage.grid.selectAllRows', {
          defaultMessage: 'Select all visible rows',
        });

  return (
    <>
      <EuiScreenReaderOnly>
        <span>
          {i18n.translate('workflowsManagement.executionsPage.grid.selectColumnHeader', {
            defaultMessage: 'Select column',
          })}
        </span>
      </EuiScreenReaderOnly>
      <EuiCheckbox
        data-test-subj="workflowExecutionsSelectAllOnPageToggle"
        id="workflow-executions-select-all-on-page-toggle"
        aria-label={title}
        title={title}
        indeterminate={isIndeterminate}
        checked={areAllVisibleSelected}
        onChange={(event) => {
          const shouldClearSelection = isIndeterminate || !event.target.checked;

          if (shouldClearSelection) {
            deselectVisibleExecutions();
          } else {
            selectAllVisibleExecutions();
          }
        }}
      />
    </>
  );
};

const SelectionRowCell = ({
  rowIndex,
  executions,
}: {
  rowIndex: number;
  executions: WorkflowExecutionListItemDto[];
}) => {
  const { isExecutionSelected, toggleExecutionSelection } = useWorkflowExecutionsGridContext();
  const execution = executions[rowIndex];

  if (!execution) {
    return null;
  }

  const toggleDocumentSelectionLabel = i18n.translate(
    'workflowsManagement.executionsPage.grid.selectExecution',
    {
      defaultMessage: `Select execution ''{rowNumber}''`,
      values: { rowNumber: rowIndex + 1 },
    }
  );

  return (
    <EuiCheckbox
      id={`workflow-execution-select-${execution.id}`}
      aria-label={toggleDocumentSelectionLabel}
      checked={isExecutionSelected(execution.id)}
      data-test-subj={`workflowExecutionsSelectExecution-${execution.id}`}
      onChange={(event) => {
        toggleExecutionSelection(
          execution.id,
          (event.nativeEvent as MouseEvent)?.shiftKey === true
        );
      }}
    />
  );
};

const RenderCellValue = ({
  rowIndex,
  columnId,
  executions,
  onOpenExecution,
}: EuiDataGridCellValueElementProps & WorkflowExecutionsGridCellContext) => {
  const execution = executions[rowIndex];

  if (!execution) {
    return null;
  }

  switch (columnId) {
    case 'workflow':
      return <WorkflowExecutionWorkflowCell execution={execution} onOpen={onOpenExecution} />;
    case 'tags':
      return <WorkflowExecutionTagsCell execution={execution} />;
    case 'triggers':
      return <WorkflowExecutionTriggersCell execution={execution} />;
    case 'startedAt':
      return <WorkflowExecutionStartedAtCell execution={execution} />;
    case 'duration':
      return <WorkflowExecutionDurationCell execution={execution} />;
    default:
      return null;
  }
};

export interface WorkflowExecutionsDataGridProps {
  ariaLabelledBy: string;
  executions: WorkflowExecutionListItemDto[];
  visibleColumns: string[];
  columnWidths: Partial<Record<string, number>>;
  sort: ExecutionTableSortOrder;
  selectedExecutionId?: string;
  selectionState: UseWorkflowExecutionsGridSelectionResult;
  onOpenExecution: (execution: WorkflowExecutionListItemDto) => void;
  onRefresh: () => void;
  onSetColumns: (columns: string[]) => void;
  onSort: (sort: ExecutionTableSortOrder) => void;
  onColumnResize: (columnId: string, width: number | undefined) => void;
  onReRunExecution?: (params: RerunWorkflowExecutionParams) => Promise<void>;
  onViewAllExecutionsForWorkflow?: (workflowId: string) => void;
}

export const WorkflowExecutionsDataGrid = ({
  ariaLabelledBy,
  executions,
  visibleColumns,
  columnWidths,
  sort,
  selectedExecutionId,
  selectionState,
  onOpenExecution,
  onRefresh,
  onSetColumns,
  onSort,
  onColumnResize,
  onReRunExecution,
  onViewAllExecutionsForWorkflow,
}: WorkflowExecutionsDataGridProps) => {
  const trailingControlColumns = useWorkflowExecutionsTrailingControlColumns(
    executions,
    onViewAllExecutionsForWorkflow,
    onReRunExecution
  );

  const gridColumns = useMemo(
    () => buildWorkflowExecutionsGridColumns(columnWidths),
    [columnWidths]
  );

  const sorting = useMemo<EuiDataGridSorting>(
    () => ({
      columns: sort.map(([id, direction]) => ({ id, direction })),
      onSort: (nextColumns) => {
        onSort(nextColumns.map(({ id, direction }) => [id, direction] as const));
      },
    }),
    [onSort, sort]
  );

  const cellContext = useMemo<WorkflowExecutionsGridCellContext>(
    () => ({
      executions,
      onOpenExecution,
    }),
    [executions, onOpenExecution]
  );

  const renderCellValue = useCallback<EuiDataGridProps['renderCellValue']>(
    (props) => <RenderCellValue {...props} {...cellContext} />,
    [cellContext]
  );

  const toolbarVisibility = useMemo<EuiDataGridToolBarVisibilityOptions>(
    () => ({
      showColumnSelector: true,
      showSortSelector: true,
      showDisplaySelector: false,
      showFullScreenSelector: false,
      showKeyboardShortcuts: false,
      additionalControls: {
        left: {
          append: <WorkflowExecutionsSelectionBar onRefresh={onRefresh} executions={executions} />,
        },
      },
    }),
    [executions, onRefresh]
  );

  const leadingControlColumns = useMemo<EuiDataGridControlColumn[]>(
    () => [
      {
        id: SELECTION_COLUMN_ID,
        width: SELECTION_COLUMN_WIDTH,
        headerCellProps: { className: 'workflowExecutionsGrid__selectionHeaderCell' },
        headerCellRender: SelectionHeaderCell,
        rowCellRender: ({ rowIndex }) => (
          <SelectionRowCell rowIndex={rowIndex} executions={executions} />
        ),
      },
    ],
    [executions]
  );

  const gridStyleWithSelection = useMemo(() => {
    const rowClasses: Record<number, string> = {};

    if (selectedExecutionId) {
      const selectedRowIndex = executions.findIndex(
        (execution) => execution.id === selectedExecutionId
      );

      if (selectedRowIndex !== -1) {
        rowClasses[selectedRowIndex] = 'workflowExecutionsTableRow--selected';
      }
    }

    return {
      ...gridStyle,
      rowClasses,
    };
  }, [executions, selectedExecutionId]);

  return (
    <WorkflowExecutionsGridProvider value={selectionState}>
      <EuiDataGrid
        aria-labelledby={ariaLabelledBy}
        columns={gridColumns}
        rowCount={executions.length}
        renderCellValue={renderCellValue}
        leadingControlColumns={leadingControlColumns}
        trailingControlColumns={trailingControlColumns}
        columnVisibility={{
          visibleColumns,
          setVisibleColumns: onSetColumns,
          canDragAndDropColumns: true,
        }}
        sorting={sorting}
        onColumnResize={({ columnId, width }) => onColumnResize(columnId, width)}
        gridStyle={gridStyleWithSelection}
        rowHeightsOptions={{ defaultHeight: { lineCount: 1 } }}
        toolbarVisibility={toolbarVisibility}
      />
    </WorkflowExecutionsGridProvider>
  );
};

WorkflowExecutionsDataGrid.displayName = 'WorkflowExecutionsDataGrid';
