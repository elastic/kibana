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
import {
  CustomCellRenderer,
  DataLoadingState,
  UnifiedDataTable,
  type SortOrder,
} from '@kbn/unified-data-table';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { difference, intersection } from 'lodash';
import { KibanaContextExtra } from '../types';
import { getCellValueRenderer } from './value_input_control';

const MemoizedUnifiedDataTable = React.memo(UnifiedDataTable);

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

const sortOrder: SortOrder[] = [];
const DEFAULT_INITIAL_ROW_HEIGHT = 5;
const DEFAULT_ROWS_PER_PAGE = 10;
const ROWS_PER_PAGE_OPTIONS = [10, 25];

const DataGrid: React.FC<ESQLDataGridProps> = (props) => {
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

  const { rows } = props;

  const savingDocs = useObservable(indexUpdateService.savingDocs$);

  const isFetching = useObservable(indexUpdateService.isFetching$, false);

  const [activeColumns, setActiveColumns] = useState<string[]>(
    (props.initialColumns || props.columns).map((c) => c.name)
  );
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [rowHeight, setRowHeight] = useState<number>(
    props.initialRowHeight ?? DEFAULT_INITIAL_ROW_HEIGHT
  );
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  // Track which cell is being edited
  const [editingCell, setEditingCell] = useState({ row: null, col: null });

  const onSetColumns = useCallback(
    (columns: string[]) => {
      setActiveColumns(columns);
      setHiddenColumns((prevState) => {
        const columnsDiff = props.columns
          .map((c) => c.name)
          .filter((name) => !columns.includes(name));
        if (columnsDiff.length !== prevState.length) {
          return columnsDiff;
        }
        return prevState;
      });
    },
    [props.columns]
  );

  // props.columns can change when a new column is added
  useEffect(() => {
    setActiveColumns((prevActiveColumns) => {
      const currentColumnNames = props.columns
        .map((c) => c.name)
        .filter((name) => !hiddenColumns.includes(name));
      const preservedOrder = intersection(prevActiveColumns, currentColumnNames);
      const newColumns = difference(currentColumnNames, preservedOrder);
      return [...newColumns, ...preservedOrder];
    });
  }, [props.columns, hiddenColumns]);

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
      onValueChange
    );
  }, [rows, props.columns, editingCell, setEditingCell, onValueChange, savingDocs]);

  const externalCustomRenderers: CustomCellRenderer = useMemo(() => {
    return activeColumns.reduce((acc, columnId) => {
      acc[columnId] = CellValueRenderer;
      return acc;
    }, {} as CustomCellRenderer);
  }, [CellValueRenderer, activeColumns]);

  return (
    <>
      <MemoizedUnifiedDataTable
        columns={activeColumns}
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
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default DataGrid;
