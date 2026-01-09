/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText, useEuiTheme } from '@elastic/eui';
import type { CascadeRowCellPrimitiveProps } from '../types';
import {
  getCascadeRowNodePath,
  getCascadeRowNodePathValueRecord,
  getCascadeRowLeafDataCacheKey,
} from '../../../lib/utils';
import {
  type GroupNode,
  type LeafNode,
  useDataCascadeState,
  useDataCascadeActions,
} from '../../../store_provider';
import { cascadeRowCellStyles } from './cascade_row_cell.styles';

export function CascadeRowCellPrimitive<G extends GroupNode, L extends LeafNode>({
  children,
  getVirtualizer,
  onCascadeLeafNodeExpanded,
  row,
  size,
}: CascadeRowCellPrimitiveProps<G, L>) {
  const { euiTheme } = useEuiTheme();
  const { leafNodes, currentGroupByColumns } = useDataCascadeState<G, L>();
  const actions = useDataCascadeActions<G, L>();
  const hasPendingRequest = useRef<boolean>(false);
  const [isPendingRowLeafDataFetch, setRowLeafDataFetch] = useState<boolean>(false);

  const styles = useMemo(() => cascadeRowCellStyles(euiTheme), [euiTheme]);

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
        row: row.original,
        nodePathMap,
        nodePath,
      });

      if (!groupLeafData) {
        return;
      }

      actions.setRowGroupLeafData({
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

  const rootVirtualizer = useMemo(() => getVirtualizer(), [getVirtualizer]);
  const virtualRow = useMemo(
    () => rootVirtualizer.getVirtualItems().find((v) => v.index === row.index),
    [rootVirtualizer, row]
  );
  const getScrollMargin = useCallback(() => virtualRow?.start ?? 0, [virtualRow]);
  const getScrollElement = useCallback(() => rootVirtualizer.scrollElement, [rootVirtualizer]);
  const getScrollOffset = useCallback(() => rootVirtualizer.scrollOffset ?? 0, [rootVirtualizer]);

  useEffect(
    () => () => {
      // ensure that for a row that's been scrolled,
      // if said row is technically still in view because it's cell is being rendered,
      // when we are unmounting because the expand action from the cell's row was clicked,
      // we want to ensure said row is the top most item in our list
      if (
        virtualRow?.index &&
        !rootVirtualizer.isScrolling &&
        getScrollOffset() > getScrollMargin()
      ) {
        rootVirtualizer.scrollToVirtualizedIndex(virtualRow.index, {
          align: 'start',
          behavior: 'auto',
        });
      }
    },
    [getScrollMargin, getScrollOffset, rootVirtualizer, virtualRow?.index]
  );

  const memoizedChild = useMemo(() => {
    return React.createElement(children, {
      data: leafData,
      cellId: leafCacheKey,
      key: leafCacheKey,
      getScrollElement,
      getScrollOffset,
      getScrollMargin,
    });
  }, [children, leafData, leafCacheKey, getScrollElement, getScrollOffset, getScrollMargin]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem css={styles.cellWrapper} tabIndex={0}>
        <EuiSkeletonText
          lines={3}
          size={size === 'l' ? 'm' : size}
          isLoading={isPendingRowLeafDataFetch || !leafData}
        >
          <div css={styles.cellInner}>{memoizedChild}</div>
        </EuiSkeletonText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
