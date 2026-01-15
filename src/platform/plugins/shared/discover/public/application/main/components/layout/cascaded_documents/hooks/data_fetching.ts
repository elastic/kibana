/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLControlVariable } from '@kbn/esql-types';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { type ESQLStatsQueryMeta } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import { useCallback, useMemo } from 'react';
import {
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
} from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import { type ESQLDataGroupNode } from '../blocks';
import type { CascadedDocumentsState } from '../../../../state_management/redux';
import { useCascadedDocumentsContext } from '../cascaded_documents_provider';

interface UseGroupedCascadeDataProps extends Pick<UnifiedDataTableProps, 'rows'> {
  cascadedDocumentsState: CascadedDocumentsState;
  queryMeta: ESQLStatsQueryMeta;
  esqlVariables: ESQLControlVariable[] | undefined;
}

/**
 * Function returns the data for the cascade group.
 */
export const useGroupedCascadeData = ({
  cascadedDocumentsState,
  rows,
  queryMeta,
  esqlVariables,
}: UseGroupedCascadeDataProps) => {
  return useMemo(
    () =>
      cascadedDocumentsState.selectedCascadeGroups.reduce((acc, cur, levelIdx) => {
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
          // skip undefined and null values
          if (key === 'undefined' || key === 'null') {
            return;
          }

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
                r[cascadedDocumentsState.selectedCascadeGroups[levelIdx - 1]] ===
                record[cascadedDocumentsState.selectedCascadeGroups[levelIdx - 1]]
            );

            if (previousLevelRecord) {
              // TODO: insert the record as a child of the previous level record
            }
          }
        });

        return acc;
      }, [] as ESQLDataGroupNode[]),
    [cascadedDocumentsState.selectedCascadeGroups, esqlVariables, queryMeta, rows]
  );
};

export function useDataCascadeRowExpansionHandlers({
  dataView,
}: {
  dataView: DataView;
}): Pick<
  DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>,
  'onCascadeGroupNodeExpanded' | 'onCascadeGroupNodeCollapsed'
> &
  Pick<
    DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>,
    'onCascadeLeafNodeExpanded' | 'onCascadeLeafNodeCollapsed'
  > {
  const { cascadedDocumentsFetcher, esqlQuery, esqlVariables, timeRange } =
    useCascadedDocumentsContext();

  /**
   * Callback invoked when a group node gets expanded, used to fetch data for group nodes.
   */
  const onCascadeGroupNodeExpanded = useCallback<
    NonNullable<
      DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['onCascadeGroupNodeExpanded']
    >
  >(
    ({ row, nodePath, nodePathMap }) => {
      return cascadedDocumentsFetcher.fetchCascadedDocuments({
        rowId: row.id,
        nodeType: 'group',
        nodePath,
        nodePathMap,
        query: esqlQuery,
        esqlVariables,
        timeRange,
        dataView,
      }) as unknown as Promise<ESQLDataGroupNode[]>;
    },
    [cascadedDocumentsFetcher, dataView, esqlQuery, esqlVariables, timeRange]
  );

  /**
   * Callback invoked when a group node gets collapsed, cancels any pending requests for the group node if necessary.
   */
  const onCascadeGroupNodeCollapsed = useCallback<
    NonNullable<
      DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['onCascadeGroupNodeCollapsed']
    >
  >(
    ({ row }) => {
      cascadedDocumentsFetcher.cancelFetch(row.id);
    },
    [cascadedDocumentsFetcher]
  );

  /**
   * Callback invoked when a leaf node gets expanded, used to fetch data for leaf nodes.
   */
  const onCascadeLeafNodeExpanded = useCallback<
    NonNullable<
      DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>
    >['onCascadeLeafNodeExpanded']
  >(
    ({ row, nodePath, nodePathMap }) => {
      return cascadedDocumentsFetcher.fetchCascadedDocuments({
        rowId: row.id,
        nodeType: 'leaf',
        nodePath,
        nodePathMap,
        query: esqlQuery,
        esqlVariables,
        timeRange,
        dataView,
      });
    },
    [cascadedDocumentsFetcher, dataView, esqlQuery, esqlVariables, timeRange]
  );

  /**
   * Callback invoked when a leaf node gets collapsed, cancels any pending requests for the leaf node if necessary.
   */
  const onCascadeLeafNodeCollapsed = useCallback<
    NonNullable<
      DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>['onCascadeLeafNodeCollapsed']
    >
  >(
    ({ row }) => {
      cascadedDocumentsFetcher.cancelFetch(row.id);
    },
    [cascadedDocumentsFetcher]
  );

  return {
    onCascadeGroupNodeExpanded,
    onCascadeGroupNodeCollapsed,
    onCascadeLeafNodeExpanded,
    onCascadeLeafNodeCollapsed,
  };
}
