/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { useCancellableSearch } from '@kbn/ml-cancellable-search';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataTableRecord } from '@kbn/discover-utils';
import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import type { FC } from 'react';
import React, { lazy, useCallback, useEffect, useMemo, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { FlyoutFooter } from './flyout_footer';
import type { EditLookupIndexContentContext, EditLookupIndexFlyoutDeps } from '../types';

export interface FlyoutContentProps {
  deps: EditLookupIndexFlyoutDeps;
  props: EditLookupIndexContentContext;
}

const DataGridLazy = withSuspense(lazy(() => import('./data_grid')));

interface IndexInfo {
  exists: boolean;
  canEdit: boolean;
}

// TODO add support for pagination
const docsCount = 10_000;

export const FlyoutContent: FC<FlyoutContentProps> = ({ deps, props }) => {
  const isMounted = useMountedState();

  const { runRequest, cancelRequest, isLoading } = useCancellableSearch(deps.data);

  const [columns, setColumns] = useState<DatatableColumn[]>([]);
  const [rows, setRows] = useState<DataTableRecord[]>([]);
  const [totalHits, setTotalHits] = useState<number>(0);
  const [dataView, setDataView] = useState<DataView>();

  // Index
  const [indexInfo, setIndexInfo] = useState<IndexInfo>();

  const { coreStart, ...restDeps } = deps;

  useEffect(
    function resolveDataView() {
      deps.data.dataViews
        .create({
          title: props.indexName,
          name: props.indexName,
          // timeFieldName,
        })
        .then((dv) => {
          if (isMounted()) {
            setDataView(dv);
          }
        });
    },
    [deps.data.dataViews, isMounted, props.indexName]
  );

  const dataViewColumns = useMemo<DatatableColumn[]>(() => {
    if (!dataView) return [];

    return (
      dataView.fields
        // Exclude metadata fields. TODO check if this is the right way to do it
        // @ts-ignore
        .filter((field) => field.spec.metadata_field !== true)
        .map((field) => {
          return {
            name: field.name,
            id: field.name,
            isNull: field.isNull,
            meta: {
              type: field.type,
              params: {
                id: field.name,
                sourceParams: {
                  fieldName: field.name,
                },
              },
              aggregatable: field.aggregatable,
              searchable: field.searchable,
              esTypes: field.esTypes,
            },
          } as DatatableColumn;
        })
    );
  }, [dataView]);

  const fetchRows = useCallback(async () => {
    cancelRequest();
    try {
      const response = await runRequest(
        {
          params: {
            index: props.indexName,
          },
        },
        { searchStrategy: ESQL_SEARCH_STRATEGY }
      );

      if (!response || !isMounted()) {
        return;
      }
      const { hits, total } = response.rawResponse.hits;

      const resultRows: DataTableRecord[] = hits.map((hit: any, idx: number) => {
        return {
          id: String(hit._id),
          raw: hit._source,
          flattened: hit._source,
        } as unknown as DataTableRecord;
      });

      setRows(resultRows);
      setTotalHits(total);
    } catch (e) {
      // TODO error handling
    }
  }, [cancelRequest, isMounted, props.indexName, runRequest]);

  useEffect(
    function fetchIndexInfo() {
      // TODO
      // - check if the user has read/write access to the index
      // - fetch index settings, e.g. if it is open/closed, etc
      fetchRows();
    },
    [fetchRows]
  );

  if (!dataView || !dataViewColumns.length || !totalHits) return null;

  return (
    <KibanaContextProvider
      services={{
        ...coreStart,
        ...restDeps,
      }}
    >
      <>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h3>{props.indexName}</h3>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <CellActionsProvider
            getTriggerCompatibleActions={deps.uiActions.getTriggerCompatibleActions}
          >
            <DataGridLazy
              data={deps.data}
              fieldFormats={deps.fieldFormats}
              core={deps.coreStart}
              share={deps.share}
              {...props}
              dataView={dataView}
              columns={dataViewColumns}
              rows={rows}
              totalHits={totalHits}
            />
          </CellActionsProvider>
        </EuiFlyoutBody>

        <FlyoutFooter indexUpdateService={deps.indexUpdateService} />
      </>
    </KibanaContextProvider>
  );
};
