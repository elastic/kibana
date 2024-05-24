/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useCallback } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { zipObject } from 'lodash';
import type { ESQLRow } from '@kbn/es-types';
import type { AggregateQuery } from '@kbn/es-query';
import useAsync from 'react-use/lib/useAsync';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { DiscoverGridFlyout } from '@kbn/discover-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import type {
  DatatableColumn,
  DatatableColumnMeta,
  DatatableRow,
} from '@kbn/expressions-plugin/common';
import { CellActionsProvider } from '@kbn/cell-actions';
import { DataLoadingState } from '@kbn/unified-data-table';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { untilPluginStartServicesReady } from './kibana_services';

interface ESQLDatatableProps {
  rows: ESQLRow[];
  dataView: DataView;
  columns: DatatableColumn[];
  query: AggregateQuery;
}

type DataTableColumnsMeta = Record<
  string,
  {
    type: DatatableColumnMeta['type'];
    esType?: DatatableColumnMeta['esType'];
  }
>;

/*
Remaining tasks:
- Is it a good idea to render the flyout from the Discover plugin? Maybe is smarter to move it on another package.
- The flyout doesn't render when the assistant is in flyout mode, ould possibly change to overlay but it has a weird behavior
- The row settings popover closes when I set the height, it should stay open (must be related to the flyout bug)
- Keep the selected columns in LLM
**/

export const ESQLTable = (props: ESQLDatatableProps) => {
  const { loading, value } = useAsync(() => {
    const startServicesPromise = untilPluginStartServicesReady();
    const modulePromise = import('@kbn/unified-data-table');
    return Promise.all([startServicesPromise, modulePromise]);
  }, []);

  const UnifiedDataTable = value?.[1].default;
  const deps = value?.[0];
  const storage = new Storage(localStorage);
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);
  const [activeColumns, setActiveColumns] = useState<string[]>([]);
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
      <DiscoverGridFlyout
        dataView={props.dataView}
        hit={hit}
        hits={displayedRows}
        columns={displayedColumns}
        columnsMeta={customColumnsMeta}
        onFilter={undefined}
        // could possibly change to overlay but it has a weird behavior
        flyoutType="push"
        onRemoveColumn={(column) => {
          setActiveColumns(activeColumns.filter((c) => c !== column));
        }}
        onAddColumn={(column) => {
          setActiveColumns([...activeColumns, column]);
        }}
        onClose={() => setExpandedDoc(undefined)}
        setExpandedDoc={setExpandedDoc}
        query={props.query}
      />
    ),
    [activeColumns, props.dataView, props.query]
  );

  if (loading || !deps || !UnifiedDataTable) return <EuiLoadingSpinner />;

  const UnifiedDataTableMemoized = React.memo(UnifiedDataTable);

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
    <KibanaContextProvider
      services={{
        ...deps,
      }}
    >
      <CellActionsProvider getTriggerCompatibleActions={deps.uiActions.getTriggerCompatibleActions}>
        <UnifiedDataTableMemoized
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
            data: deps.data,
            theme: deps.core.theme,
            uiSettings: deps.core.uiSettings,
            toastNotifications: deps.core.notifications.toasts,
            fieldFormats: deps.fieldFormats,
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
          ariaLabelledBy="ESQLDatatable"
          maxDocFieldsDisplayed={100}
          renderDocumentView={renderDocumentView}
          showFullScreenButton={false}
          configRowHeight={5}
          rowHeightState={rowHeight}
          onUpdateRowHeight={setRowHeight}
        />
      </CellActionsProvider>
    </KibanaContextProvider>
  );
};
