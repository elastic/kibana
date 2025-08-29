/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { Row } from '@tanstack/react-table';
import type { GroupNode } from '../../../store_provider';
import { useRowVirtualizerHelper } from '.';

const rowsToRender = (rowCount: number): Row<GroupNode>[] => {
  return Array.from(
    { length: rowCount },
    (_, index) =>
      new Proxy(
        {
          id: `row-${index}`,
        } as Row<GroupNode>,
        {
          get(target, prop) {
            if (prop === 'depth') {
              return 0;
            }
            return Reflect.get(target, prop);
          },
        }
      )
  );
};

describe('useRowVirtualizerHelper', () => {
  it('should render correctly', () => {
    const { result } = renderHook(() =>
      useRowVirtualizerHelper({
        rows: rowsToRender(100),
        overscan: 5,
        enableStickyGroupHeader: false,
        getScrollElement: () => document.body,
      })
    );

    expect(result.current).toHaveProperty('activeStickyIndex');
    expect(result.current).toHaveProperty('rowVirtualizer');
    expect(result.current).toHaveProperty('virtualizedRowsSizeCache');
    expect(result.current).toHaveProperty('virtualizedRowComputedTranslateValue');
  });
});
