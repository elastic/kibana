/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { CellActionsProvider } from '@kbn/cell-actions';
import { DataView, type FieldSpec } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { DataLoadingState, type SortOrder, UnifiedDataTable } from '@kbn/unified-data-table';
import {
  STATIC_WORKFLOW_EXECUTION_ROWS,
  WORKFLOW_EXECUTIONS_STUB_DATA_VIEW_TITLE,
  type WorkflowExecutionListStubRow,
} from './static_execution_rows';
import type { WorkflowsServices } from '../../types';

const INITIAL_COLUMNS: string[] = [
  '@timestamp',
  'workflow_name',
  'status',
  'execution_id',
  'trigger_type',
];

const sortOrder: SortOrder[] = [];

const noopGetTriggerCompatibleActions: UiActionsStart['getTriggerCompatibleActions'] =
  async () => [];

function stringField(name: string): FieldSpec {
  return {
    name,
    type: 'string',
    esTypes: ['keyword'],
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
    scripted: false,
  };
}

function dateField(name: string): FieldSpec {
  return {
    name,
    type: 'date',
    esTypes: ['date'],
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
    scripted: false,
  };
}

function createStubExecutionsDataView(fieldFormats: WorkflowsServices['fieldFormats']): DataView {
  const fields: Record<string, FieldSpec> = {
    '@timestamp': dateField('@timestamp'),
    execution_id: stringField('execution_id'),
    workflow_name: stringField('workflow_name'),
    status: stringField('status'),
    trigger_type: stringField('trigger_type'),
  };

  return new DataView({
    spec: {
      title: WORKFLOW_EXECUTIONS_STUB_DATA_VIEW_TITLE,
      allowNoIndex: true,
      timeFieldName: '@timestamp',
      fields,
    },
    fieldFormats,
    metaFields: ['_id', '_type', '_source'],
  });
}

function rowsToDataTableRecords(rows: WorkflowExecutionListStubRow[]): DataTableRecord[] {
  return rows.map(
    (row) =>
      ({
        id: row.execution_id,
        raw: row,
        flattened: row,
      } as unknown as DataTableRecord)
  );
}

const ROWS_PER_PAGE_OPTIONS = [10, 25];
const DEFAULT_ROWS_PER_PAGE = 10;

export interface WorkflowExecutionsStubDataGridProps {
  services: WorkflowsServices;
}

export const WorkflowExecutionsStubDataGrid = React.memo<WorkflowExecutionsStubDataGridProps>(
  ({ services }) => {
    const { data, fieldFormats, notifications, theme, uiSettings } = services;

    const dataView = useMemo(() => createStubExecutionsDataView(fieldFormats), [fieldFormats]);

    const [columns, setColumns] = useState<string[]>(INITIAL_COLUMNS);
    const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

    const rows = useMemo(() => rowsToDataTableRecords(STATIC_WORKFLOW_EXECUTION_ROWS), []);

    const unifiedTableServices = useMemo(
      () => ({
        data,
        theme,
        uiSettings,
        toastNotifications: notifications.toasts,
        fieldFormats,
        storage: new Storage(localStorage),
      }),
      [data, fieldFormats, notifications.toasts, theme, uiSettings]
    );

    const onSetColumns = useCallback((next: string[]) => {
      setColumns(next);
    }, []);

    return (
      <CellActionsProvider getTriggerCompatibleActions={noopGetTriggerCompatibleActions}>
        <UnifiedDataTable
          ariaLabelledBy="workflowExecutionsStubDataGrid"
          columns={columns}
          css={css`
            .unifiedDataTableToolbar {
              padding: 4px 0;
            }
          `}
          controlColumnIds={[]}
          dataView={dataView}
          disableCellActions
          enableComparisonMode={false}
          enableInTableSearch={false}
          isPaginationEnabled
          isPlainRecord
          isSortEnabled={false}
          loadingState={DataLoadingState.loaded}
          maxDocFieldsDisplayed={50}
          onSetColumns={onSetColumns}
          onUpdateRowsPerPage={setRowsPerPage}
          rows={rows}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          rowsPerPageState={rowsPerPage}
          sampleSizeState={rows.length}
          services={unifiedTableServices}
          showFullScreenButton={false}
          showKeyboardShortcuts={false}
          showTimeCol
          sort={sortOrder}
        />
      </CellActionsProvider>
    );
  }
);
WorkflowExecutionsStubDataGrid.displayName = 'WorkflowExecutionsStubDataGrid';
