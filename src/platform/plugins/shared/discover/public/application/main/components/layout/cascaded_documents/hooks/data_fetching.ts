/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef, useEffect } from 'react';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import type { CascadeQueryArgs } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import {
  type ESQLStatsQueryMeta,
  constructCascadeQuery,
} from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import { i18n } from '@kbn/i18n';
import type { AggregateQuery } from '@kbn/es-query';
import { useCallback, useMemo } from 'react';
import { apm } from '@elastic/apm-rum';
import {
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
} from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord } from '@kbn/discover-utils';
import { v5 as uuidv5 } from 'uuid';
import { isNil } from 'lodash';
import { fetchEsql } from '../../../../data_fetching/fetch_esql';
import { type ESQLDataGroupNode } from '../blocks';
import type { CascadedDocumentsContext } from '../cascaded_documents_provider';

interface UseGroupedCascadeDataProps
  extends Pick<UnifiedDataTableProps, 'rows'>,
    Pick<CascadedDocumentsContext, 'selectedCascadeGroups' | 'esqlVariables'> {
  queryMeta: ESQLStatsQueryMeta;
}

const NODE_ID_NAMESPACE = '5a14c15b-0999-49a6-84f5-2bad4f24c45a';

/**
 * Function returns the data for the cascade group.
 */
export const useGroupedCascadeData = ({
  selectedCascadeGroups,
  rows,
  queryMeta,
  esqlVariables,
}: UseGroupedCascadeDataProps) => {
  return useMemo(
    () =>
      selectedCascadeGroups.reduce<ESQLDataGroupNode[]>((allGroups, groupColumn, groupDepth) => {
        let resolvedGroupColumn: string = groupColumn;

        const matchingGroupVariable = esqlVariables?.find(
          (variable) => variable.key === groupColumn.replace(/^\?\?/, '')
        );

        if (matchingGroupVariable) {
          resolvedGroupColumn = matchingGroupVariable.value.toString();
        }

        const rowsGroupedByValue = Object.groupBy(rows ?? [], (row) =>
          String(row.flattened[resolvedGroupColumn])
        );

        Object.entries(rowsGroupedByValue).forEach(([groupValue, groupRows = []]) => {
          // skip undefined and null values
          if (groupValue === 'undefined' || groupValue === 'null') {
            return;
          }

          const groupNode: ESQLDataGroupNode = {
            id: uuidv5(`${groupColumn}-${groupValue}`, NODE_ID_NAMESPACE),
            // While we use explicit properties for better typing, the document_data_cascade package
            // requires `[groupColumn]: groupValue` to be populated in order to build its `nodePathMap`
            [groupColumn]: groupValue,
            groupColumn,
            groupValue,
            aggregatedValues: groupRows.reduce<ESQLDataGroupNode['aggregatedValues']>(
              (allValues, row) => {
                queryMeta.appliedFunctions.forEach(({ identifier }) => {
                  const currentValue = row.flattened[identifier];

                  if (isNil(currentValue)) {
                    return;
                  }

                  const existingValue = allValues[identifier];

                  if (typeof currentValue === 'number') {
                    if (typeof existingValue === 'number') {
                      allValues[identifier] = existingValue + currentValue;
                    } else if (isNil(existingValue)) {
                      allValues[identifier] = currentValue;
                    }
                  } else if (Array.isArray(currentValue)) {
                    const valuesArray = currentValue.map(String);

                    if (Array.isArray(existingValue)) {
                      allValues[identifier] = [...existingValue, ...valuesArray];
                    } else if (isNil(existingValue)) {
                      allValues[identifier] = valuesArray;
                    }
                  }
                });

                return allValues;
              },
              {}
            ),
          };

          if (groupDepth === 0) {
            allGroups.push(groupNode);
          } else {
            // we need to find the node in allGroups that has the same value for the previous level of cascade grouping
            const previousLevelColumn = selectedCascadeGroups[groupDepth - 1];
            const previousLevelNode = allGroups.find(
              (otherNode) => otherNode.groupColumn === previousLevelColumn
            );

            if (previousLevelNode) {
              // TODO: insert the node as a child of the previous level node
            }
          }
        });

        return allGroups;
      }, []),
    [esqlVariables, queryMeta.appliedFunctions, rows, selectedCascadeGroups]
  );
};

interface UseScopedESQLQueryFetchClientProps
  extends Pick<
    Parameters<typeof fetchEsql>[0],
    | 'dataView'
    | 'data'
    | 'expressions'
    | 'timeRange'
    | 'scopedProfilesManager'
    | 'esqlVariables'
    | 'inspectorAdapters'
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
  timeRange,
  scopedProfilesManager,
  inspectorAdapters,
}: UseScopedESQLQueryFetchClientProps) {
  const abortController = useRef<AbortController | null>(null);

  const cancelRequest = useCallback((reason?: string) => {
    abortController.current?.abort(reason);
  }, []);

  const scopedESQLQueryFetch = useCallback(
    (esqlQuery: AggregateQuery, abortSignal: AbortSignal) =>
      fetchEsql({
        query: esqlQuery,
        esqlVariables,
        dataView,
        data,
        expressions,
        abortSignal,
        timeRange,
        scopedProfilesManager,
        inspectorAdapters,
        inspectorConfig: {
          title: i18n.translate('discover.dataCascade.inspector.cascadeQueryTitle', {
            defaultMessage: 'Cascade Row Data Query',
          }),
          description: i18n.translate('discover.dataCascade.inspector.cascadeQueryDescription', {
            defaultMessage:
              'This request queries Elasticsearch to fetch the documents matching the value of the expanded cascade row.',
          }),
        },
      }),
    [
      data,
      dataView,
      esqlVariables,
      expressions,
      inspectorAdapters,
      scopedProfilesManager,
      timeRange,
    ]
  );

  const baseFetch = useCallback(
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
        // maybe track the inputted query, to learn about the kind of queries that bug
        apm.captureError(new Error('Failed to construct cascade query'));
        return [];
      }

      if (!abortController.current?.signal?.aborted) {
        cancelRequest('starting new request');
      }

      abortController.current = new AbortController();

      const { records } = await scopedESQLQueryFetch(
        newQuery,
        abortController.current!.signal
      ).catch((error) => {
        // handle abort errors gracefully
        if (error.message.includes('aborted')) {
          return { records: [] };
        }
        // rethrow other errors
        throw error;
      });

      return records;
    },
    [scopedESQLQueryFetch, esqlVariables, dataView, query, cancelRequest]
  );

  useEffect(
    // handle cleanup for when the component unmounts
    () => () => {
      // cancel any pending requests
      cancelRequest('unmount cleanup');
    },
    [cancelRequest]
  );

  return useMemo(
    () =>
      Object.assign(baseFetch, {
        /**
         * Cancels any pending requests for the cascade fetch client.
         */
        cancel: cancelRequest.bind(null, 'request cancellation'),
      }),
    [baseFetch, cancelRequest]
  );
}

interface UseDataCascadePropsProps {
  cascadeFetchClient: ReturnType<typeof useScopedESQLQueryFetchClient>;
}

export function useDataCascadeRowExpansionHandlers({
  cascadeFetchClient,
}: UseDataCascadePropsProps): Pick<
  DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>,
  'onCascadeGroupNodeExpanded' | 'onCascadeGroupNodeCollapsed'
> &
  Pick<
    DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>,
    'onCascadeLeafNodeExpanded' | 'onCascadeLeafNodeCollapsed'
  > {
  /**
   * Callback invoked when a group node gets expanded, used to fetch data for group nodes.
   */
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

  /**
   * Callback invoked when a group node gets collapsed, cancels any pending requests for the group node if necessary.
   */
  const onCascadeGroupNodeCollapsed = useCallback<
    NonNullable<
      DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['onCascadeGroupNodeCollapsed']
    >
  >(() => {
    return cascadeFetchClient.cancel();
  }, [cascadeFetchClient]);

  /**
   * Callback invoked when a leaf node gets expanded, used to fetch data for leaf nodes.
   */
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

  /**
   * Callback invoked when a leaf node gets collapsed, cancels any pending requests for the leaf node if necessary.
   */
  const onCascadeLeafNodeCollapsed = useCallback<
    NonNullable<
      DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>['onCascadeLeafNodeCollapsed']
    >
  >(() => {
    return cascadeFetchClient.cancel();
  }, [cascadeFetchClient]);

  return {
    onCascadeGroupNodeExpanded,
    onCascadeGroupNodeCollapsed,
    onCascadeLeafNodeExpanded,
    onCascadeLeafNodeCollapsed,
  };
}
