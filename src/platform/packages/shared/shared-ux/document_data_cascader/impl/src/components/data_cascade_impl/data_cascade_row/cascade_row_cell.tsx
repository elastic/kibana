/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart } from '@elastic/eui';
import type { CellContext, Row } from '@tanstack/react-table';
import {
  getCascadeRowLeafDataCacheKey,
  getCascadeRowNodePath,
  getCascadeRowNodePathValueRecord,
} from './utils';
import { type GroupNode, type LeafNode, useDataCascadeState } from '../../data_cascade_provider';

export interface CascadeRowCellProps<G extends GroupNode, L extends LeafNode>
  extends CellContext<G, unknown> {
  populateGroupLeafDataFn: (args: { row: Row<G> }) => Promise<void>;
  rowHeaderTitleSlot: React.FC<{ row: Row<G> }>;
  rowHeaderMetaSlots?: (props: { row: Row<G> }) => React.ReactNode[];
  leafContentSlot: React.FC<{ data: L[] | null }>;
}

export function CascadeRowCell<G extends GroupNode, L extends LeafNode>({
  row,
  populateGroupLeafDataFn,
  rowHeaderTitleSlot: RowTitleSlot,
  rowHeaderMetaSlots,
  leafContentSlot: LeafContentSlot,
}: CascadeRowCellProps<G, L>) {
  const { leafNodes, currentGroupByColumns } = useDataCascadeState<G, L>();
  const [isPendingRowLeafDataFetch, setRowLeafDataFetch] = React.useState<boolean>(false);
  const isLeafNode = !row.getCanExpand();
  const getLeafCacheKey = useCallback(() => {
    return getCascadeRowLeafDataCacheKey(
      getCascadeRowNodePath(currentGroupByColumns, row),
      getCascadeRowNodePathValueRecord(currentGroupByColumns, row),
      row.id
    );
  }, [currentGroupByColumns, row]);

  const leafData = useMemo(() => {
    return isLeafNode ? leafNodes.get(getLeafCacheKey()) ?? null : null;
  }, [getLeafCacheKey, isLeafNode, leafNodes]);

  const fetchCascadeRowGroupLeafData = React.useCallback(() => {
    // synchronously mark request as pending to avoid multiple re-renders in turn causing multiple requests
    flushSync(() => setRowLeafDataFetch(true));
    populateGroupLeafDataFn({ row }).finally(() => {
      setRowLeafDataFetch(false);
    });
  }, [populateGroupLeafDataFn, row]);

  React.useEffect(() => {
    if (!leafData && isLeafNode && row.getIsExpanded() && !isPendingRowLeafDataFetch) {
      fetchCascadeRowGroupLeafData();
    }
  }, [fetchCascadeRowGroupLeafData, isLeafNode, isPendingRowLeafDataFetch, leafData, row]);

  return (
    <EuiFlexGroup direction="column" css={{ padding: `0 ${8 * row.depth}px` }}>
      <EuiFlexItem>
        <EuiFlexGroup direction="row">
          <EuiFlexItem grow={4}>
            <RowTitleSlot row={row} />
          </EuiFlexItem>
          <EuiFlexItem grow={6}>
            <EuiFlexGroup
              direction="row"
              gutterSize="m"
              alignItems="center"
              justifyContent="flexEnd"
            >
              {rowHeaderMetaSlots?.({ row }).map((metaSlot, index) => (
                <EuiFlexItem grow={false} key={index}>
                  {metaSlot}
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <React.Fragment>
        {isLeafNode && row.getIsAllParentsExpanded() && row.getIsExpanded() && (
          <EuiFlexItem grow={10}>
            {isPendingRowLeafDataFetch ? (
              <EuiFlexGroup justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiLoadingChart size="l" />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <LeafContentSlot data={leafData} />
            )}
          </EuiFlexItem>
        )}
      </React.Fragment>
    </EuiFlexGroup>
  );
}
