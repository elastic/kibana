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
import {
  getCascadeRowLeafDataCacheKey,
  getCascadeRowNodePath,
  getCascadeRowNodePathValueRecord,
} from './utils';
import { type GroupNode, type LeafNode, useDataCascadeState } from '../../data_cascade_provider';

export interface CascadeRowCellProps<G extends GroupNode, L extends LeafNode>
  extends CellContext<G, unknown> {
  populateGroupLeafDataFn: (args: { row: Row<G> }) => Promise<void>;
  leafContentSlot: React.FC<{ data: L[] | null }>;
  size: keyof Pick<EuiThemeShape['size'], 's' | 'm' | 'l'>;
}

export function CascadeRowCell<G extends GroupNode, L extends LeafNode>({
  leafContentSlot: LeafContentSlot,
  populateGroupLeafDataFn,
  row,
  size,
}: CascadeRowCellProps<G, L>) {
  const hasPendingRequest = useRef<boolean>(false);
  const { leafNodes, currentGroupByColumns } = useDataCascadeState<G, L>();
  const [isPendingRowLeafDataFetch, setRowLeafDataFetch] = useState<boolean>(false);

  const getLeafCacheKey = useCallback(() => {
    return getCascadeRowLeafDataCacheKey(
      getCascadeRowNodePath(currentGroupByColumns, row),
      getCascadeRowNodePathValueRecord(currentGroupByColumns, row),
      row.id
    );
  }, [currentGroupByColumns, row]);

  const leafData = useMemo(() => {
    return leafNodes.get(getLeafCacheKey()) ?? null;
  }, [getLeafCacheKey, leafNodes]);

  const fetchCascadeRowGroupLeafData = useCallback(() => {
    if (!hasPendingRequest.current) {
      hasPendingRequest.current = true;

      populateGroupLeafDataFn({ row }).finally(() => {
        setRowLeafDataFetch(false);
        hasPendingRequest.current = false;
      });
    }
  }, [populateGroupLeafDataFn, row]);

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
          <LeafContentSlot data={leafData} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
