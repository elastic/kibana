/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KeyboardEvent, RefObject } from 'react';
import { createRef } from 'react';
import { keys } from '@elastic/eui';
import { act, renderHook } from '@testing-library/react';
import { useGridNavigation } from './use_grid_navigation';

describe('useGridNavigation', () => {
  const gridRef = createRef<HTMLDivElement>();

  it('resets focus to the first cell when totalRows or gridColumns change', () => {
    const { result, rerender } = renderHook(
      (props: { totalRows: number }) =>
        useGridNavigation({
          gridColumns: 4,
          gridRows: Math.ceil(props.totalRows / 4),
          totalRows: props.totalRows,
          gridRef,
        }),
      { initialProps: { totalRows: 16 } }
    );

    act(() => {
      result.current.handleFocusCell(3, 3);
    });

    expect(result.current.focusedCell).toEqual({ rowIndex: 3, colIndex: 3 });

    rerender({ totalRows: 4 });

    expect(result.current.focusedCell).toEqual({ rowIndex: 0, colIndex: 0 });
  });

  it('arrow down clamps column when the row below is shorter (partial last row)', () => {
    const container = document.createElement('div');
    for (const key of ['1-3', '2-0', '2-1'] as const) {
      const cell = document.createElement('div');
      cell.setAttribute('data-grid-cell', key);
      container.appendChild(cell);
    }
    document.body.appendChild(container);

    const ref: RefObject<HTMLDivElement> = { current: container };

    const { result } = renderHook(() =>
      useGridNavigation({
        gridColumns: 4,
        gridRows: 3,
        totalRows: 10,
        gridRef: ref,
      })
    );

    act(() => {
      result.current.handleFocusCell(1, 3);
    });

    const preventDefault = jest.fn();
    act(() => {
      result.current.handleKeyDown({
        key: keys.ARROW_DOWN,
        preventDefault,
      } as unknown as KeyboardEvent<HTMLDivElement>);
    });

    expect(result.current.focusedCell).toEqual({ rowIndex: 2, colIndex: 1 });
    expect(preventDefault).toHaveBeenCalled();

    container.remove();
  });
});
