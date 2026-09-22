/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { applyStoreDerivatives, useCreateStore } from './store';

describe('applyDerivatives', () => {
  it('applies derivatives in array order', () => {
    const result = applyStoreDerivatives({ a: 1, b: 0, c: 0 }, [
      { key: 'b', compute: (state) => state.a + 1 },
      { key: 'c', compute: (state) => state.b + 1 },
    ]);

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });
});

describe('useCreateStore derivatives', () => {
  it('seeds derived state before the first render', () => {
    const { result } = renderHook(() =>
      useCreateStore({
        initialState: {
          count: 1,
          doubled: 0,
        },
        reducers: {
          increment: (state) => ({
            ...state,
            count: state.count + 1,
          }),
        },
        derivatives: [{ key: 'doubled', compute: (state) => state.count * 2 }],
      })
    );

    expect(result.current.state.doubled).toBe(2);
  });

  it('recomputes derived state after each dispatch', () => {
    const { result } = renderHook(() =>
      useCreateStore({
        initialState: {
          count: 1,
          doubled: 0,
        },
        reducers: {
          increment: (state) => ({
            ...state,
            count: state.count + 1,
          }),
        },
        derivatives: [{ key: 'doubled', compute: (state) => state.count * 2 }],
      })
    );

    act(() => {
      result.current.actions.increment();
    });

    expect(result.current.state.count).toBe(2);
    expect(result.current.state.doubled).toBe(4);
  });
});
