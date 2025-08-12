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
import {
  CustomCellRenderer,
  DataLoadingState,
  UnifiedDataTable,
  type SortOrder,
  CustomGridColumnsConfiguration,
  type EuiDataGridRefProps,
} from '@kbn/unified-data-table';
import type { RestorableStateProviderApi } from '@kbn/restorable-state';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { difference, intersection } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RowColumnCreator } from './row_column_creator';
import { getColumnInputRenderer } from './grid_custom_renderers/column_input_renderer';
import { KibanaContextExtra } from '../types';
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
  const [sortOrder, setSortOrder] = useState<SortOrder[]>([]);

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
      storage,
    },
  } = useKibana<KibanaContextExtra>();

  const savingDocs = useObservable(indexUpdateService.savingDocs$);

  const isFetching = useObservable(indexUpdateService.isFetching$, false);

  const isIndexCreated = useObservable(
    indexUpdateService.indexCreated$,
    indexUpdateService.isIndexCreated()
  );

  const [activeColumns, setActiveColumns] = useState<string[]>(
    (props.initialColumns || props.columns).map((c) => c.name)
  );
  const hiddenColumns = useRef<string[]>([]);
  const [rowHeight, setRowHeight] = useState<number>(
    props.initialRowHeight ?? DEFAULT_INITIAL_ROW_HEIGHT
  );
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  const onSetColumns = useCallback(
    (columns: string[]) => {
      setActiveColumns(columns);

      const columnsDiff = props.columns
        .map((c) => c.name)
        .filter((name) => !columns.includes(name));
      if (columnsDiff.length !== hiddenColumns.current.length) {
        hiddenColumns.current = columnsDiff;
      }
    },
    [props.columns]
  );

  // Visible columns are calculated based on 3 sources:
  // - The columns provided by the props, they provide the initial columns set, and any new column added by the user plus the placeholders.
  // - The activeColumns state, which is the list of columns that are currently visible in the grid. But most importantly,
  // it preserves the order of the columns given by the user.
  // The visible columns are determined by:
  // - Filter out hidden columns from the props.columns
  // - Ensure the order is preserved based on activeColumns and the new columns that might have been added.
  const renderedColumns = useMemo(() => {
    const currentColumnNames = props.columns
      .map((c) => c.name)
      .filter((name) => !hiddenColumns.current.includes(name));

    // It's important to only keep the columns that are still present in the props.columns
    const preservedOrder = intersection(activeColumns, currentColumnNames);
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
        savingDocs,
        dataTableRef,
      }),
    [rows, props.columns, onValueChange, dataTableRef, savingDocs]
  );
  const CellValueRenderer = useMemo(() => {
    return getCellValueRenderer(rows, savingDocs, dataTableRef, isIndexCreated);
  }, [rows, savingDocs, isIndexCreated]);

  const externalCustomRenderers: CustomCellRenderer = useMemo(() => {
    return renderedColumns.reduce((acc, columnId) => {
      acc[columnId] = CellValueRenderer;
      return acc;
    }, {} as CustomCellRenderer);
  }, [CellValueRenderer, renderedColumns]);

  // We render an editable header for columns that are not saved in the index.
  const customGridColumnsConfiguration = useMemo(() => {
    return renderedColumns.reduce((acc, columnName) => {
      if (!props.dataView.fields.getByName(columnName)) {
        acc[columnName] = getColumnInputRenderer(columnName, indexUpdateService);
      }
      return acc;
    }, {} as CustomGridColumnsConfiguration);
  }, [renderedColumns, props.dataView, indexUpdateService]);

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

  return (
    <EuiFlexGroup direction="column" gutterSize="s" css={{ overflow: 'hidden', height: '100%' }}>
      <EuiFlexItem grow={false}>
        <RowColumnCreator dataTableRef={dataTableRef} />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <UnifiedDataTable
          ref={dataTableRef}
          customGridColumnsConfiguration={customGridColumnsConfiguration}
          columns={renderedColumns}
          rows={rows}
          columnsMeta={columnsMeta}
          services={services}
          enableInTableSearch
          externalCustomRenderers={externalCustomRenderers}
          renderCellPopover={renderCellPopover}
          isPlainRecord
          isSortEnabled
          showMultiFields={false}
          showColumnTokens
          showTimeCol
          enableComparisonMode={false}
          isPaginationEnabled
          showKeyboardShortcuts
          totalHits={props.totalHits}
          rowsPerPageState={rowsPerPage}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          sampleSizeState={10_000}
          canDragAndDropColumns
          loadingState={isFetching ? DataLoadingState.loading : DataLoadingState.loaded}
          dataView={props.dataView}
          onSetColumns={onSetColumns}
          onUpdateRowsPerPage={setRowsPerPage}
          onSort={(newSort) => setSortOrder(newSort as SortOrder[])}
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
            .euiDataGridHeaderCell {
              align-items: center;
              display: flex;
            }
          `}
        />
        <EuiSpacer size="l" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default DataGrid;
