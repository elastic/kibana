/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef, useEffect } from 'react';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import type { CascadeQueryArgs } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import {
  type ESQLStatsQueryMeta,
  constructCascadeQuery,
} from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import type { AggregateQuery } from '@kbn/es-query';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { useCallback, useMemo } from 'react';
import { apm } from '@elastic/apm-rum';
import {
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
} from '@kbn/shared-ux-document-data-cascade';
import { fetchEsql } from '../../../../data_fetching/fetch_esql';
import type { DataTableRecord } from '../blocks';
import { type ESQLDataGroupNode } from '../blocks';
import type { CascadedDocumentsRestorableState } from '../cascaded_documents_restorable_state';

interface UseGroupedCascadeDataProps extends Pick<UnifiedDataTableProps, 'rows'> {
  cascadeConfig: CascadedDocumentsRestorableState;
  queryMeta: ESQLStatsQueryMeta;
  esqlVariables: ESQLControlVariable[] | undefined;
}

/**
 * Function returns the data for the cascade group.
 */
export const useGroupedCascadeData = ({
  cascadeConfig,
  rows,
  queryMeta,
  esqlVariables,
}: UseGroupedCascadeDataProps) => {
  return useMemo(
    () =>
      cascadeConfig.selectedCascadeGroups.reduce((acc, cur, levelIdx) => {
        let dataAccessorKey: string = cur;

        const selectedGroupVariable = esqlVariables?.find(
          (variable) => variable.key === cur.replace(/^\?\?/, '')
        );

        if (selectedGroupVariable) {
          dataAccessorKey = selectedGroupVariable.value as string;
        }

        const groupMatch = Object.groupBy(
          rows ?? [],
          // @ts-expect-error - we know that the data accessor key is a string
          (datum) => datum.flattened[dataAccessorKey]
        );

        Object.entries(groupMatch).forEach(([key, value], idx) => {
          const record = {
            id: String(idx),
            [cur]: key,
            ...value?.reduce((derivedColumns, datum) => {
              queryMeta.appliedFunctions.forEach(({ identifier }) => {
                if (datum.flattened[identifier]) {
                  derivedColumns[identifier] =
                    (derivedColumns[identifier] ?? 0) + Number(datum.flattened[identifier]);
                }
              });
              return derivedColumns;
            }, {} as Record<string, number>),
          };

          if (levelIdx === 0) {
            acc.push(record);
          } else {
            // we need to find the record in acc that has the same value for the previous level of cascade grouping
            const previousLevelRecord = acc.find(
              (r: ESQLDataGroupNode) =>
                r[cascadeConfig.selectedCascadeGroups[levelIdx - 1]] ===
                record[cascadeConfig.selectedCascadeGroups[levelIdx - 1]]
            );

            if (previousLevelRecord) {
              // TODO: insert the record as a child of the previous level record
            }
          }
        });

        return acc;
      }, [] as ESQLDataGroupNode[]),
    [cascadeConfig.selectedCascadeGroups, esqlVariables, queryMeta, rows]
  );
};

interface UseScopedESQLQueryFetchClientProps
  extends Pick<
    Parameters<typeof fetchEsql>[0],
    | 'dataView'
    | 'data'
    | 'expressions'
    | 'filters'
    | 'timeRange'
    | 'scopedProfilesManager'
    | 'esqlVariables'
  > {
  query: AggregateQuery;
}

/**
 * Returns a function that fetches the data for the scoped ESQL query.
 */
export function useScopedESQLQueryFetchClient({
  query,
  dataView,
  data,
  expressions,
  esqlVariables,
  filters,
  timeRange,
  scopedProfilesManager,
}: UseScopedESQLQueryFetchClientProps) {
  const abortController = useRef<AbortController | null>(null);

  const inspectorAdapters = useMemo(() => ({ requests: new RequestAdapter() }), []);

  useEffect(
    // handle cleanup for when the component unmounts
    () => () => {
      // cancel any pending requests
      abortController.current?.abort();
    },
    []
  );

  const scopedESQLQueryFetch = useCallback(
    (esqlQuery: AggregateQuery, abortSignal: AbortSignal) =>
      fetchEsql({
        query: esqlQuery,
        esqlVariables,
        dataView,
        data,
        expressions,
        abortSignal,
        filters,
        timeRange,
        scopedProfilesManager,
        inspectorAdapters,
      }),
    [
      data,
      dataView,
      esqlVariables,
      expressions,
      filters,
      inspectorAdapters,
      scopedProfilesManager,
      timeRange,
    ]
  );

  return useCallback(
    async ({
      nodeType,
      nodePath,
      nodePathMap,
    }: Omit<CascadeQueryArgs, 'query' | 'dataView' | 'esqlVariables'>) => {
      const newQuery = constructCascadeQuery({
        query,
        esqlVariables,
        dataView,
        nodeType,
        nodePath,
        nodePathMap,
      });

      if (!newQuery) {
        // maybe track the inputed query, to learn about the kind of queries that bug
        apm.captureError(new Error('Failed to construct cascade query'));
        return [];
      }

      if (!abortController.current?.signal?.aborted) {
        // cancel pending requests, if any
        abortController.current?.abort();
      }

      abortController.current = new AbortController();

      const { records } = await scopedESQLQueryFetch(newQuery, abortController.current!.signal);

      return records;
    },
    [scopedESQLQueryFetch, esqlVariables, dataView, query]
  );
}

interface UseDataCascadePropsProps {
  cascadeFetchClient: ReturnType<typeof useScopedESQLQueryFetchClient>;
}

export function useDataCascadeRowExpansionHandlers({
  cascadeFetchClient,
}: UseDataCascadePropsProps): Pick<
  DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>,
  'onCascadeGroupNodeExpanded'
> &
  Pick<DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>, 'onCascadeLeafNodeExpanded'> {
  const onCascadeGroupNodeExpanded = useCallback<
    NonNullable<
      DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['onCascadeGroupNodeExpanded']
    >
  >(
    ({ nodePath, nodePathMap }) => {
      return cascadeFetchClient({
        nodePath,
        nodePathMap,
        nodeType: 'group',
      }) as unknown as Promise<ESQLDataGroupNode[]>;
    },
    [cascadeFetchClient]
  );

  const onCascadeLeafNodeExpanded = useCallback<
    NonNullable<
      DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>
    >['onCascadeLeafNodeExpanded']
  >(
    ({ nodePath, nodePathMap }) => {
      return cascadeFetchClient({
        nodePath,
        nodePathMap,
        nodeType: 'leaf',
      });
    },
    [cascadeFetchClient]
  );

  return {
    onCascadeGroupNodeExpanded,
    onCascadeLeafNodeExpanded,
  };
}
