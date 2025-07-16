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
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { css } from '@emotion/react';
import {
  CustomCellRenderer,
  DataLoadingState,
  UnifiedDataTable,
  type SortOrder,
  CustomGridColumnsConfiguration,
} from '@kbn/unified-data-table';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { difference, intersection, times } from 'lodash';
import { COLUMN_PLACEHOLDER_PREFIX } from '../constants';
import { KibanaContextExtra } from '../types';
import { getCellValueRenderer } from './value_input_control';
import { AddColumnHeader } from './add_column_header';

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
const MAX_COLUMN_PLACEHOLDERS = 4;

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

  // Track which cell is being edited
  const [editingCell, setEditingCell] = useState<{ row: number | null; col: string | null }>({
    row: null,
    col: null,
  });

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
  // - The columns provided by the props, they provide the initial columns set, and any new column added by the user.
  // - The activeColumns state, which is the list of columns that are currently visible in the grid. But most importantly, it preserves the order of the columns.
  // - The hiddenColumns ref, which tracks the columns that are currently hidden.
  // The visible columns are determined by:
  // - Filter out hidden columns from the props.columns
  // - Ensure the order is preserved based on activeColumns
  // - Add any new columns that are not in the preserved order to the beginning
  const renderedColumns = useMemo(() => {
    const currentColumnNames = props.columns
      .map((c) => c.name)
      .filter((name) => !hiddenColumns.current.includes(name));

    const preservedOrder = intersection(activeColumns, currentColumnNames);
    const newColumns = difference(currentColumnNames, preservedOrder);

    const missingPlaceholders = MAX_COLUMN_PLACEHOLDERS - props.columns.length;
    const addColumnPlaceholders =
      missingPlaceholders > 0
        ? times(missingPlaceholders, (idx) => `${COLUMN_PLACEHOLDER_PREFIX}${idx}`)
        : [];

    return [...newColumns, ...preservedOrder, ...addColumnPlaceholders];
  }, [props.columns, hiddenColumns, activeColumns]);

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
    const storage = new Storage(localStorage);

    return {
      data,
      theme,
      uiSettings,
      toastNotifications: notifications?.toasts,
      dataViewFieldEditor,
      fieldFormats,
      storage,
    };
  }, [data, theme, uiSettings, notifications?.toasts, dataViewFieldEditor, fieldFormats]);

  const onValueChange = useCallback(
    (docId: string, update: any) => {
      // reset editing cell
      setEditingCell({ row: null, col: null });
      // make a call to update the doc with the new value
      indexUpdateService.updateDoc(docId, update);
      // update rows to reflect the change
    },
    [setEditingCell, indexUpdateService]
  );

  const CellValueRenderer = useMemo(() => {
    return getCellValueRenderer(
      rows,
      props.columns,
      editingCell,
      savingDocs,
      setEditingCell,
      onValueChange,
      isIndexCreated
    );
  }, [rows, props.columns, editingCell, setEditingCell, onValueChange, savingDocs, isIndexCreated]);

  const externalCustomRenderers: CustomCellRenderer = useMemo(() => {
    return renderedColumns.reduce((acc, columnId) => {
      acc[columnId] = CellValueRenderer;
      return acc;
    }, {} as CustomCellRenderer);
  }, [CellValueRenderer, renderedColumns]);

  const customGridColumnsConfiguration = useMemo(() => {
    return renderedColumns.reduce((acc, columnName) => {
      if (columnName.startsWith(COLUMN_PLACEHOLDER_PREFIX)) {
        acc[columnName] = ({ column }) => ({
          ...column,
          display: <AddColumnHeader />,
          actions: false,
          displayHeaderCellProps: {
            className: 'custom-column--placeholder',
          },
        });
      } else {
        acc[columnName] = ({ column }) => ({
          ...column,
          displayHeaderCellProps: {
            className: 'custom-column',
          },
        });
      }
      return acc;
    }, {} as CustomGridColumnsConfiguration);
  }, [renderedColumns]);

  return (
    <>
      <UnifiedDataTable
        customGridColumnsConfiguration={customGridColumnsConfiguration}
        columns={renderedColumns}
        rows={rows}
        columnsMeta={columnsMeta}
        services={services}
        enableInTableSearch
        externalCustomRenderers={externalCustomRenderers}
        isPlainRecord
        isSortEnabled
        showMultiFields={false}
        showColumnTokens
        showTimeCol
        enableComparisonMode
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
        disableCellActions
        disableCellPopover
        css={css`
          .euiDataGridRowCell__content > div,
          .unifiedDataTable__cellValue {
            height: 100%;
            width: 100%;
            display: block;
          }
          .custom-column {
            justify-content: center;
          }
          .custom-column--placeholder {
            padding: 0;
          }
        `}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default DataGrid;
