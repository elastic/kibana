/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { zipObject } from 'lodash';
import { UnifiedDataTable, DataLoadingState } from '@kbn/unified-data-table';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ESQLRow } from '@kbn/es-types';
import type {
  DatatableColumn,
  DatatableColumnMeta,
  DatatableRow,
} from '@kbn/expressions-plugin/common';
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
}
type DataTableColumnsMeta = Record<
  string,
  {
    type: DatatableColumnMeta['type'];
    esType?: DatatableColumnMeta['esType'];
  }
>;

const DataGrid: React.FC<ESQLDataGridProps> = (props) => {
  const storage = new Storage(localStorage);
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);
  const [activeColumns, setActiveColumns] = useState<string[]>(
    props.isTableView ? props.columns.map((c) => c.name) : []
  );
  const [rowHeight, setRowHeight] = useState<number>(5);

  if (props.dataView.fields.getByName('@timestamp')?.type === 'date') {
    props.dataView.timeFieldName = '@timestamp';
  }

  const renderDocumentView = useCallback(
    (
      hit: DataTableRecord,
      displayedRows: DataTableRecord[],
      displayedColumns: string[],
      customColumnsMeta?: DataTableColumnsMeta
    ) => (
      <RowViewer
        dataView={props.dataView}
        toastNotifications={props.core.notifications}
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

  const columnsMeta = props.columns.reduce((acc, column) => {
    acc[column.id] = {
      type: column.meta?.type,
      esType: column.meta?.esType ?? column.meta?.type,
    };
    return acc;
  }, {} as DataTableColumnsMeta);

  const columnNames = props.columns?.map(({ name }) => name);
  const rows: DatatableRow[] = props.rows.map((row) => zipObject(columnNames, row));

  return (
    <UnifiedDataTable
      columns={activeColumns}
      rows={rows.map((row: Record<string, string>, idx: number) => {
        return {
          id: String(idx),
          raw: row,
          flattened: row,
        } as unknown as DataTableRecord;
      })}
      columnsMeta={columnsMeta}
      services={{
        data: props.data,
        theme: props.core.theme,
        uiSettings: props.core.uiSettings,
        toastNotifications: props.core.notifications.toasts,
        fieldFormats: props.fieldFormats,
        storage,
      }}
      isPlainRecord
      isSortEnabled={false}
      loadingState={DataLoadingState.loaded}
      dataView={props.dataView}
      sampleSizeState={500}
      rowsPerPageState={10}
      onSetColumns={(columns) => {
        setActiveColumns(columns);
      }}
      expandedDoc={expandedDoc}
      setExpandedDoc={setExpandedDoc}
      showTimeCol
      useNewFieldsApi
      enableComparisonMode
      sort={[]}
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
