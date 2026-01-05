/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useCreateStore } from './store';

describe('store', () => {
  it('provisions a store, with actions to manipulate the store state', () => {
    const { result } = renderHook(() =>
      useCreateStore({
        initialState: {
          name: 'Kimchy',
        },
        reducers: {
          setName: (state, newName: string) => {
            const newState = {
              ...state,
              name: newName,
            };
            return newState;
          },
          resetState: () => {
            return {
              name: 'Kimchy',
            };
          },
        },
      })
    );

    expect(result.current).toHaveProperty('state');
    expect(result.current).toHaveProperty('actions');

    act(() => {
      result.current.actions.setName('NewName');
    });

    expect(result.current.state.name).toBe('NewName');

    act(() => {
      result.current.actions.resetState();
    });

    expect(result.current.state.name).toBe('Kimchy');
  });
});
