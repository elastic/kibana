/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, type EuiThemeShape } from '@elastic/eui';
import type { CellContext, Row } from '@tanstack/react-table';
import { getCascadeRowNodePath, getCascadeRowNodePathValueRecord } from '../../../lib/utils';
import {
  type GroupNode,
  type LeafNode,
  useDataCascadeState,
  useDataCascadeActions,
} from '../../store_provider';

interface OnCascadeLeafNodeExpandedArgs<G extends GroupNode> {
  row: Row<G>;
  /**
   * @description The path of the row that was expanded in the group by hierarchy.
   */
  nodePath: string[];
  /**
   * @description KV record of the path values for the row node.
   */
  nodePathMap: Record<string, string>;
}

export interface CascadeRowCellPrimitiveProps<G extends GroupNode, L extends LeafNode>
  extends CellContext<G, unknown> {
  /**
   * @description Size of the row cell
   */
  size: keyof Pick<EuiThemeShape['size'], 's' | 'm' | 'l'>;
  /**
   * @description Callback invoked when a leaf node gets expanded, which can be used to fetch data for leaf nodes.
   */
  onCascadeLeafNodeExpanded: (args: OnCascadeLeafNodeExpandedArgs<G>) => Promise<L[]>;
  children: (args: { data: L[] | null }) => React.ReactNode;
}

/**
 * @description This function generates a cache key to persist and retrieve the leaf data of a cascade row.
 */
export function getCascadeRowLeafDataCacheKey(
  nodePath: string[],
  nodePathMap: Record<string, string>,
  leafId: string
) {
  return nodePath
    .map((path) => nodePathMap[path])
    .concat(leafId)
    .join(':');
}

export function CascadeRowCellPrimitive<G extends GroupNode, L extends LeafNode>({
  children,
  onCascadeLeafNodeExpanded,
  row,
  size,
}: CascadeRowCellPrimitiveProps<G, L>) {
  const { leafNodes, currentGroupByColumns } = useDataCascadeState<G, L>();
  const actions = useDataCascadeActions<G, L>();
  const hasPendingRequest = useRef<boolean>(false);
  const [isPendingRowLeafDataFetch, setRowLeafDataFetch] = useState<boolean>(false);

  const nodePath = useMemo(
    () => getCascadeRowNodePath(currentGroupByColumns, row),
    [currentGroupByColumns, row]
  );

  const nodePathMap = useMemo(
    () => getCascadeRowNodePathValueRecord(currentGroupByColumns, row),
    [currentGroupByColumns, row]
  );

  const leafCacheKey = useMemo(() => {
    return getCascadeRowLeafDataCacheKey(nodePath, nodePathMap, row.id);
  }, [nodePath, nodePathMap, row]);

  const leafData = useMemo(() => {
    return leafNodes.get(leafCacheKey) ?? null;
  }, [leafCacheKey, leafNodes]);

  const fetchGroupLeafData = useCallback(() => {
    const dataFetchFn = async () => {
      const groupLeafData = await onCascadeLeafNodeExpanded({
        row,
        nodePathMap,
        nodePath,
      });

      if (!groupLeafData) {
        return;
      }

      actions.updateRowGroupLeafData({
        cacheKey: leafCacheKey,
        data: groupLeafData,
      });
    };

    return dataFetchFn().catch((error) => {
      // eslint-disable-next-line no-console -- added for debugging purposes
      console.error('Error fetching data for leaf node', error);
    });
  }, [actions, leafCacheKey, nodePath, nodePathMap, onCascadeLeafNodeExpanded, row]);

  const fetchCascadeRowGroupLeafData = useCallback(() => {
    if (!hasPendingRequest.current) {
      hasPendingRequest.current = true;

      fetchGroupLeafData().finally(() => {
        setRowLeafDataFetch(false);
        hasPendingRequest.current = false;
      });
    }
  }, [fetchGroupLeafData]);

  useEffect(() => {
    if (!leafData && !isPendingRowLeafDataFetch) {
      fetchCascadeRowGroupLeafData();
    }
  }, [fetchCascadeRowGroupLeafData, leafData, isPendingRowLeafDataFetch]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        {isPendingRowLeafDataFetch || !leafData ? (
          <EuiFlexGroup justifyContent="spaceAround">
            <EuiFlexItem grow={false}>
              <EuiLoadingChart size={size === 's' ? 'm' : size} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          React.createElement(children, { data: leafData })
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
