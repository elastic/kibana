/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableColumnsMeta, DataTableRecord } from '@kbn/discover-utils/types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { css } from '@emotion/react';
import type { CustomCellRenderer, CustomGridColumnsConfiguration } from '@kbn/unified-data-table';
import {
  DataLoadingState,
  UnifiedDataTable,
  type SortOrder,
  type EuiDataGridRefProps,
} from '@kbn/unified-data-table';
import type { RestorableStateProviderApi } from '@kbn/restorable-state';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { difference, intersection, isEqual } from 'lodash';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { memoize } from 'lodash';
import { RowColumnCreator } from './row_column_creator';
import { getColumnHeaderRenderer } from './grid_custom_renderers/column_header_renderer';
import { type KibanaContextExtra } from '../types';
import { getCellValueRenderer } from './grid_custom_renderers/cell_value_renderer';
import { getValueInputPopover } from './grid_custom_renderers/value_input_popover';

interface ESQLDataGridProps {
  rows: DataTableRecord[];
  dataView: DataView;
  columns: DatatableColumn[];
  flyoutType?: 'overlay' | 'push';
  initialColumns?: DatatableColumn[];
  initialRowHeight?: number;
  controlColumnIds?: string[];
  totalHits?: number;
}

const DEFAULT_INITIAL_ROW_HEIGHT = 2;
const DEFAULT_ROWS_PER_PAGE = 10;
const ROWS_PER_PAGE_OPTIONS = [10, 25];

const DataGrid: React.FC<ESQLDataGridProps> = (props) => {
  const { rows } = props;

  const {
    services: {
      fieldFormats,
      theme,
      uiSettings,
      data,
      notifications,
      dataViewFieldEditor,
      indexUpdateService,
      indexEditorTelemetryService,
      storage,
    },
  } = useKibana<KibanaContextExtra>();

  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);

  const isFetching = useObservable(indexUpdateService.isFetching$, false);
  const sortOrder = useObservable(indexUpdateService.sortOrder$, []);

  const [activeColumns, setActiveColumns] = useState<string[]>(
    (props.initialColumns || props.columns).map((c) => c.name)
  );

  const [rowHeight, setRowHeight] = useState<number>(
    props.initialRowHeight ?? DEFAULT_INITIAL_ROW_HEIGHT
  );
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  // These are the columns that are currently rendered in the grid.
  // The columns data is taken from the props.columns. It has all the available columns, including placeholders.
  // The order of the columns is determined by the activeColumns state.
  const renderedColumns = useMemo(() => {
    const currentColumnNames = props.columns.map((c) => c.name);

    // Order the columns based on the activeColumns
    const preservedOrder = intersection(activeColumns, currentColumnNames);

    // Identify the new columns
    const newColumns = difference(currentColumnNames, preservedOrder);

    // We need to place the new columns, (the ones not present in activeColumns) at their original index.
    if (newColumns.length > 0) {
      newColumns.forEach((newColumn) => {
        const newColumnIndex = currentColumnNames.findIndex((col) => col === newColumn);
        // if there is a new column, we added at it original index
        preservedOrder.splice(newColumnIndex, 0, newColumn);
      });
    }

    return preservedOrder;
  }, [props.columns, activeColumns]);

  // We need to keep active columns in sync with rendered columns to not lose the user defined order.
  if (!isEqual(activeColumns, renderedColumns)) {
    setActiveColumns(renderedColumns);
  }

  const columnsMeta = useMemo(() => {
    return props.columns.reduce((acc, column) => {
      acc[column.id] = {
        type: column.meta?.type,
        esType: column.meta?.esType ?? column.meta?.type,
      };
      return acc;
    }, {} as DataTableColumnsMeta);
  }, [props.columns]);

  const services = useMemo(() => {
    return {
      data,
      theme,
      uiSettings,
      toastNotifications: notifications?.toasts,
      dataViewFieldEditor,
      fieldFormats,
      storage,
    };
  }, [data, theme, uiSettings, notifications?.toasts, dataViewFieldEditor, fieldFormats, storage]);

  const onValueChange = useCallback(
    (docId: string, update: any) => {
      // make a call to update the doc with the new value
      indexUpdateService.updateDoc(docId, update);
      // update rows to reflect the change
    },
    [indexUpdateService]
  );

  const dataTableRef = useRef<EuiDataGridRefProps & RestorableStateProviderApi>(null);
  const renderCellPopover = useMemo(
    () =>
      getValueInputPopover({
        rows,
        columns: props.columns,
        onValueChange,
        dataTableRef,
        telemetryService: indexEditorTelemetryService,
      }),
    [rows, props.columns, onValueChange, dataTableRef, indexEditorTelemetryService]
  );
  const CellValueRenderer = useMemo(() => {
    return getCellValueRenderer(rows, dataTableRef, indexUpdateService.canEditIndex);
  }, [rows, indexUpdateService.canEditIndex]);

  const externalCustomRenderers: CustomCellRenderer = useMemo(() => {
    return renderedColumns.reduce((acc, columnId) => {
      acc[columnId] = CellValueRenderer;
      return acc;
    }, {} as CustomCellRenderer);
  }, [CellValueRenderer, renderedColumns]);

  // We render an editable header for columns that are not saved in the index.
  const customGridColumnsConfiguration = useMemo<CustomGridColumnsConfiguration>(() => {
    return renderedColumns.reduce<CustomGridColumnsConfiguration>(
      (acc, columnName, columnIndex) => {
        const isSavedColumn = !!props.dataView.fields.getByName(columnName);
        const editMode = editingColumnIndex === columnIndex;
        const columnType = columnsMeta[columnName]?.type;
        acc[columnName] = memoize(
          getColumnHeaderRenderer(
            columnName,
            columnType,
            columnIndex,
            isSavedColumn,
            editMode,
            setEditingColumnIndex,
            indexUpdateService,
            indexEditorTelemetryService
          )
        );

        return acc;
      },
      {} as CustomGridColumnsConfiguration
    );
  }, [
    renderedColumns,
    props.dataView.fields,
    editingColumnIndex,
    columnsMeta,
    indexUpdateService,
    indexEditorTelemetryService,
  ]);

  const bulkActions = useMemo<
    React.ComponentProps<typeof UnifiedDataTable>['customBulkActions']
  >(() => {
    return [
      {
        key: 'deleteSelected',
        icon: 'trash',
        label: (
          <FormattedMessage
            id="indexEditor.tableAction.removeDocsLabel"
            defaultMessage="Delete selected"
          />
        ),
        onClick: ({ selectedDocIds }) => {
          indexUpdateService.deleteDoc(selectedDocIds);
        },
        'data-test-subj': 'indexEditorDeleteDocs',
      },
    ];
  }, [indexUpdateService]);

  const onSort = useCallback(
    (newSort: string[][]) => indexUpdateService.setSort(newSort as SortOrder[]),
    [indexUpdateService]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s" css={{ height: '100%' }}>
      <EuiFlexItem grow={false}>
        <RowColumnCreator dataTableRef={dataTableRef} />
      </EuiFlexItem>
      <EuiFlexItem grow={true} css={{ minHeight: 0 }}>
        <UnifiedDataTable
          ref={dataTableRef}
          customGridColumnsConfiguration={customGridColumnsConfiguration}
          columns={renderedColumns}
          rows={rows}
          columnsMeta={columnsMeta}
          services={services}
          enableInTableSearch
          externalCustomRenderers={externalCustomRenderers}
          renderCellPopover={indexUpdateService.canEditIndex ? renderCellPopover : undefined}
          isPlainRecord
          isSortEnabled={false} // Sort is temporarily disabled, see https://github.com/elastic/kibana/issues/235070
          showMultiFields={false}
          showColumnTokens
          showTimeCol
          enableComparisonMode={false}
          isPaginationEnabled
          showKeyboardShortcuts
          totalHits={props.totalHits}
          rowsPerPageState={rowsPerPage}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          sampleSizeState={10000}
          canDragAndDropColumns
          loadingState={isFetching ? DataLoadingState.loading : DataLoadingState.loaded}
          dataView={props.dataView}
          onSetColumns={setActiveColumns}
          onUpdateRowsPerPage={setRowsPerPage}
          onSort={onSort}
          sort={sortOrder}
          ariaLabelledBy="lookupIndexDataGrid"
          maxDocFieldsDisplayed={100}
          showFullScreenButton={false}
          configRowHeight={DEFAULT_INITIAL_ROW_HEIGHT}
          rowHeightState={rowHeight}
          onUpdateRowHeight={setRowHeight}
          controlColumnIds={props.controlColumnIds}
          customBulkActions={bulkActions}
          css={css`
            .euiDataGridRowCell__content > div,
            .unifiedDataTable__cellValue {
              height: 100%;
              width: 100%;
              display: block;
            }
            .unifiedDataTable__headerCell {
              align-items: center !important;
            }
            .euiDataGridHeaderCell {
              align-items: center;
              display: flex;
            }
          `}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default DataGrid;
