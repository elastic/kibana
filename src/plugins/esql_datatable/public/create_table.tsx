/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { DataView } from '@kbn/data-views-plugin/common';
import type {
  DatatableColumn,
  DatatableRow,
  DatatableColumnMeta,
} from '@kbn/expressions-plugin/common';
import { CellActionsProvider } from '@kbn/cell-actions';
import { DataLoadingState } from '@kbn/unified-data-table';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { untilPluginStartServicesReady } from './kibana_services';

interface ESQLDatatableProps {
  rows: DatatableRow[];
  dataView: DataView;
  columns: DatatableColumn[];
}

type DataTableColumnsMeta = Record<
  string,
  {
    type: DatatableColumnMeta['type'];
    esType?: DatatableColumnMeta['esType'];
  }
>;

export const ESQLTable = (props: ESQLDatatableProps) => {
  const { loading, value } = useAsync(() => {
    const startServicesPromise = untilPluginStartServicesReady();
    const modulePromise = import('@kbn/unified-data-table');
    return Promise.all([startServicesPromise, modulePromise]);
  }, []);

  const UnifiedDataTable = value?.[1].default;
  const deps = value?.[0];
  const storage = new Storage(localStorage);
  if (loading || !deps || !UnifiedDataTable) return <EuiLoadingSpinner />;

  const columnsMeta = props.columns.reduce((acc, column) => {
    acc[column.id] = {
      type: column.meta?.type,
      esType: column.meta?.esType ?? column.meta?.type,
    };
    return acc;
  }, {} as DataTableColumnsMeta);

  return (
    <KibanaContextProvider
      services={{
        ...deps,
      }}
    >
      <CellActionsProvider getTriggerCompatibleActions={deps.uiActions.getTriggerCompatibleActions}>
        <UnifiedDataTable
          columns={[]}
          rows={props.rows.map((row: Record<string, string>, idx: number) => {
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
          isPlainRecord={true}
          isSortEnabled
          loadingState={DataLoadingState.loaded}
          dataView={props.dataView}
          sampleSizeState={100}
          onSetColumns={() => {}}
          showTimeCol
          useNewFieldsApi
          // sort={['timestamp', 'desc']}
          sort={[]}
          ariaLabelledBy="ESQLDatatable"
        />
      </CellActionsProvider>
    </KibanaContextProvider>
  );
};
