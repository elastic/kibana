/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { type ESQLStatsQueryMeta } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import { useMemo, useState } from 'react';
import {
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
} from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord } from '@kbn/discover-utils';
import { v5 as uuidv5 } from 'uuid';
import { isNil } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/common';
import useLatest from 'react-use/lib/useLatest';
import { type ESQLDataGroupNode } from '../blocks';
import type { CascadedDocumentsContext } from '../cascaded_documents_provider';
import { useCascadedDocumentsContext } from '../cascaded_documents_provider';

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

const useStableHandler = <T extends (...args: Parameters<T>) => ReturnType<T>>(handler: T): T => {
  const latestHandler = useLatest(handler);
  const [stableHandler] = useState(() => (...args: Parameters<T>) => {
    return latestHandler.current?.(...args);
  });

  return stableHandler as T;
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
  const onCascadeGroupNodeExpanded = useStableHandler<
    NonNullable<
      DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['onCascadeGroupNodeExpanded']
    >
  >(() => {
    // TODO: We don't support nested groups yet.
    return Promise.resolve([]);
  });

  /**
   * Callback invoked when a group node gets collapsed, cancels any pending requests for the group node if necessary.
   */
  const onCascadeGroupNodeCollapsed = useStableHandler<
    NonNullable<
      DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['onCascadeGroupNodeCollapsed']
    >
  >(() => {
    // TODO: We don't support nested groups yet.
  });

  /**
   * Callback invoked when a leaf node gets expanded, used to fetch data for leaf nodes.
   */
  const onCascadeLeafNodeExpanded = useStableHandler<
    NonNullable<
      DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>
    >['onCascadeLeafNodeExpanded']
  >(({ row, nodePath, nodePathMap }) => {
    return cascadedDocumentsFetcher.fetchCascadedDocuments({
      nodeId: row.id,
      nodeType: 'leaf',
      nodePath,
      nodePathMap,
      query: esqlQuery,
      esqlVariables,
      timeRange,
      dataView,
    });
  });

  /**
   * Callback invoked when a leaf node gets collapsed, cancels any pending requests for the leaf node if necessary.
   */
  const onCascadeLeafNodeCollapsed = useStableHandler<
    NonNullable<
      DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>['onCascadeLeafNodeCollapsed']
    >
  >(({ row }) => {
    cascadedDocumentsFetcher.cancelFetch(row.id);
  });

  return {
    onCascadeGroupNodeExpanded,
    onCascadeGroupNodeCollapsed,
    onCascadeLeafNodeExpanded,
    onCascadeLeafNodeCollapsed,
  };
}
