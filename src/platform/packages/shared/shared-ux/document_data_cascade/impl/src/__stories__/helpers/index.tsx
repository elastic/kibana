/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiButtonGroup } from '@elastic/eui';
import React, { useCallback } from 'react';
import type { MockGroupData } from '../../__fixtures__/types';
import type { DataCascadeProps, DataCascadeRowProps } from '../../components';
import type { LeafNode } from '../../store_provider';

/**
 * Returns a callback function that renders the custom table header for the Data Cascade component.
 */
export function useCustomTableHeader({ headerTitle }: { headerTitle: React.ReactNode }) {
  return useCallback<NonNullable<DataCascadeProps<MockGroupData, LeafNode>['customTableHeader']>>(
    ({ currentSelectedColumns, availableColumns, onGroupSelection }) => (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>{headerTitle}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <strong>Group by:</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonGroup
                legend="select columns"
                idSelected={currentSelectedColumns[0]}
                options={availableColumns.map((col) => ({ id: col, label: col }))}
                onChange={(id) => {
                  onGroupSelection([id]);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [headerTitle]
  );
}

/**
 * Returns a callback function that renders the row header title slot for the Data Cascade component.
 */
export function useRowHeaderTitleSlot() {
  return useCallback<
    NonNullable<DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderTitleSlot']>
  >(({ rowData, nodePath }) => {
    const rowGroup = nodePath[nodePath.length - 1];
    return (
      <EuiText>
        <h2>{rowData[rowGroup]}</h2>
      </EuiText>
    );
  }, []);
}
