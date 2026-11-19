/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { useControllerValue, type ChildVirtualizerController } from '../../../lib/core/virtualizer';
import { cascadeRowCellStyles } from './cascade_row_cell.styles';
import { useStickyHeaderExtensionPoint } from '../data_cascade_row/components/cascade_row_header_extension_point';

export function CascadeRowCellPrimitive<G extends GroupNode, L extends LeafNode>({
  children,
  getVirtualizer,
  onCascadeLeafNodeExpanded,
  onCascadeLeafNodeCollapsed,
  row,
  size,
}: CascadeRowCellPrimitiveProps<G, L>) {
  const { euiTheme } = useEuiTheme();
  const stickyHeaderExtensionPoint = useStickyHeaderExtensionPoint();
  const { rowIndex } = stickyHeaderExtensionPoint;
  const { leafNodes, currentGroupByColumns } = useDataCascadeState<G, L>();
  const actions = useDataCascadeActions<G, L>();
  const hasPendingRequest = useRef<boolean>(false);

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

  const childController: ChildVirtualizerController = useMemo(
    () => getVirtualizer().childController,
    [getVirtualizer]
  );

  // Subscribe to the controller's activation state.
  // This is the coordination signal — the stagger decides when heavy content should mount.
  const isActivated = useControllerValue(
    childController,
    (c) => c.shouldActivate(leafCacheKey),
    false
  );

  useEffect(
    () => childController.enqueue(leafCacheKey, rowIndex),
    [childController, leafCacheKey, rowIndex]
  );

  const isDetached = useControllerValue(childController, (c) => c.isDetached(leafCacheKey), false);

  const fetchGroupLeafData = useCallback(() => {
    const dataFetchFn = async () => {
      const groupLeafData = await onCascadeLeafNodeExpanded({
        row: row.original,
        nodePathMap,
        nodePath,
      });

      if (!groupLeafData) {
        childController.clearPersistedAnchor(leafCacheKey);
        return;
      }

      actions.setRowGroupLeafData({
        cacheKey: leafCacheKey,
        data: groupLeafData,
      });
    };

    return dataFetchFn().catch(() => {
      childController.clearPersistedAnchor(leafCacheKey);
      // The consumer owns the error presentation.
    });
  }, [
    actions,
    leafCacheKey,
    nodePath,
    nodePathMap,
    onCascadeLeafNodeExpanded,
    row,
    childController,
  ]);

  const fetchCascadeRowGroupLeafData = useCallback(() => {
    if (!hasPendingRequest.current) {
      hasPendingRequest.current = true;

      fetchGroupLeafData().finally(() => {
        hasPendingRequest.current = false;
      });
    }
  }, [fetchGroupLeafData]);

  useEffect(() => {
    if (!leafData) {
      fetchCascadeRowGroupLeafData();
    }
  }, [fetchCascadeRowGroupLeafData, leafData]);

  useEffect(
    () => () => {
      onCascadeLeafNodeCollapsed?.({
        row: row.original,
        nodePath,
        nodePathMap,
      });
    },
    [onCascadeLeafNodeCollapsed, nodePath, nodePathMap, row]
  );

  const isRowReturning = childController.isReturningCell(leafCacheKey);
  const isReady = Boolean(leafData) && (isActivated || isRowReturning);

  const memoizedChild = useMemo(() => {
    return React.createElement(children, {
      data: leafData,
      cellId: leafCacheKey,
      key: leafCacheKey,
      nodePath,
      nodePathMap,
      virtualizerController: childController,
      rowIndex,
      stickyHeaderExtensionPoint,
    });
  }, [
    children,
    leafData,
    leafCacheKey,
    nodePath,
    nodePathMap,
    childController,
    rowIndex,
    stickyHeaderExtensionPoint,
  ]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem css={styles.cellWrapper} data-cascade-row-loading={!isReady} tabIndex={0}>
        <EuiSkeletonText lines={3} size={size === 'l' ? 'm' : size} isLoading={!isReady}>
          <div css={[styles.cellInner, isDetached && styles.detachedCell]}>{memoizedChild}</div>
        </EuiSkeletonText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
