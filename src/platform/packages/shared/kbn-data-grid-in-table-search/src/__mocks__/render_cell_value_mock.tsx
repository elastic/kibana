/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { useMockContextValue } from './mock_context';

export function getRenderCellValueMock(testData: string[][]) {
  return function OriginalRenderCellValue({
    colIndex,
    rowIndex,
  }: EuiDataGridCellValueElementProps) {
    const mockContextValue = useMockContextValue();
    const cellValue = testData[rowIndex][colIndex];

    if (!cellValue) {
      throw new Error('Testing unexpected errors');
    }

    return (
      <div>
        {cellValue}
        {
          // testing that it can access the parent context value
          mockContextValue ? <span>{mockContextValue}</span> : null
        }
      </div>
    );
  };
}
