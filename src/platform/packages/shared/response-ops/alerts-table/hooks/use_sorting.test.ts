/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useSorting } from './use_sorting';

import { renderHook, act } from '@testing-library/react';

describe('useSorting', () => {
  const onSortChange = jest.fn();

  beforeEach(() => {
    onSortChange.mockClear();
  });

  it('should return the sorted columns and the callback function to call when sort changes', () => {
    const { result } = renderHook(() => useSorting(onSortChange, ['@timestamp']));
    expect(result.current.sortingColumns).toStrictEqual([
      {
        direction: 'desc',
        id: '@timestamp',
      },
    ]);
    expect(result.current.onSort).toBeDefined();
  });

  it('should change the columns when `onSort` is called', () => {
    const { result } = renderHook(() => useSorting(onSortChange, ['@timestamp', 'field']));

    act(() => {
      result.current.onSort([{ id: 'field', direction: 'asc' }]);
    });

    expect(onSortChange).toHaveBeenCalledWith(
      expect.arrayContaining([{ direction: 'asc', id: 'field' }])
    );
    expect(result.current.sortingColumns).toStrictEqual([{ direction: 'asc', id: 'field' }]);
  });

  it('should exclude any inactive column from the final sort configuration', () => {
    const { result } = renderHook(() =>
      useSorting(
        onSortChange,
        ['@timestamp'],
        [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
          {
            'kibana.alert.start': {
              order: 'desc',
            },
          },
        ]
      )
    );
    expect(result.current.sortingColumns).toStrictEqual([
      {
        id: '@timestamp',
        direction: 'desc',
      },
    ]);
    expect(result.current.onSort).toBeDefined();
  });
});
