/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { zipObject } from 'lodash';
import { UnifiedDataTable, DataLoadingState, type SortOrder } from '@kbn/unified-data-table';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ESQLRow } from '@kbn/es-types';
import type { DatatableColumn, DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import type { AggregateQuery } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { RowViewer } from './row_viewer_lazy';

interface ESQLDataGridProps {
  core: CoreStart;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  rows: ESQLRow[];
  dataView: DataView;
  columns: DatatableColumn[];
  query: AggregateQuery;
  flyoutType?: 'overlay' | 'push';
  isTableView?: boolean;
  initialColumns?: DatatableColumn[];
}
type DataTableColumnsMeta = Record<
  string,
  {
    type: DatatableColumnMeta['type'];
    esType?: DatatableColumnMeta['esType'];
  }
>;

const sortOrder: SortOrder[] = [];

const DataGrid: React.FC<ESQLDataGridProps> = (props) => {
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);
  const [activeColumns, setActiveColumns] = useState<string[]>(
    (props.initialColumns || (props.isTableView ? props.columns : [])).map((c) => c.name)
  );
  const [rowHeight, setRowHeight] = useState<number>(5);

  const onSetColumns = useCallback((columns) => {
    setActiveColumns(columns);
  }, []);

  const renderDocumentView = useCallback(
    (
      hit: DataTableRecord,
      displayedRows: DataTableRecord[],
      displayedColumns: string[],
      customColumnsMeta?: DataTableColumnsMeta
    ) => (
      <RowViewer
        dataView={props.dataView}
        notifications={props.core.notifications}
        hit={hit}
        hits={displayedRows}
        columns={displayedColumns}
        columnsMeta={customColumnsMeta}
        flyoutType={props.flyoutType ?? 'push'}
        onRemoveColumn={(column) => {
          setActiveColumns(activeColumns.filter((c) => c !== column));
        }}
        onAddColumn={(column) => {
          setActiveColumns([...activeColumns, column]);
        }}
        onClose={() => setExpandedDoc(undefined)}
        setExpandedDoc={setExpandedDoc}
      />
    ),
    [activeColumns, props.core.notifications, props.dataView, props.flyoutType]
  );

  const columnsMeta = useMemo(() => {
    return props.columns.reduce((acc, column) => {
      acc[column.id] = {
        type: column.meta?.type,
        esType: column.meta?.esType ?? column.meta?.type,
      };
      return acc;
    }, {} as DataTableColumnsMeta);
  }, [props.columns]);

  const rows: DataTableRecord[] = useMemo(() => {
    const columnNames = props.columns?.map(({ name }) => name);
    return props.rows
      .map((row) => zipObject(columnNames, row))
      .map((row, idx: number) => {
        return {
          id: String(idx),
          raw: row,
          flattened: row,
        } as unknown as DataTableRecord;
      });
  }, [props.columns, props.rows]);

  const services = useMemo(() => {
    const storage = new Storage(localStorage);

    return {
      data: props.data,
      theme: props.core.theme,
      uiSettings: props.core.uiSettings,
      toastNotifications: props.core.notifications.toasts,
      fieldFormats: props.fieldFormats,
      storage,
    };
  }, [
    props.core.notifications.toasts,
    props.core.theme,
    props.core.uiSettings,
    props.data,
    props.fieldFormats,
  ]);

  return (
    <UnifiedDataTable
      columns={activeColumns}
      rows={rows}
      columnsMeta={columnsMeta}
      services={services}
      isPlainRecord
      isSortEnabled={false}
      loadingState={DataLoadingState.loaded}
      dataView={props.dataView}
      sampleSizeState={rows.length}
      rowsPerPageState={10}
      onSetColumns={onSetColumns}
      expandedDoc={expandedDoc}
      setExpandedDoc={setExpandedDoc}
      showTimeCol
      useNewFieldsApi
      enableComparisonMode
      sort={sortOrder}
      ariaLabelledBy="esqlDataGrid"
      maxDocFieldsDisplayed={100}
      renderDocumentView={renderDocumentView}
      showFullScreenButton={false}
      configRowHeight={5}
      rowHeightState={rowHeight}
      onUpdateRowHeight={setRowHeight}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default DataGrid;
