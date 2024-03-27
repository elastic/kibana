/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type ComponentProps, type ComponentType } from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useModalContext, ModalContextProvider } from '.';

type ModalContextProviderProps = ComponentProps<typeof ModalContextProvider>;

function createModalContextWrapper<T extends ComponentType>(props: ModalContextProviderProps) {
  return function CreatedWrapper({ children }) {
    return <ModalContextProvider {...props}>{children}</ModalContextProvider>;
  };
}

describe('tabbed modal provider', () => {
  it('creates a default internal state of specific shape', () => {
    const props: ModalContextProviderProps = {
      tabs: [
        {
          id: 'test',
          name: 'Test',
        },
      ],
      defaultSelectedTabId: 'test',
    };

    const { result } = renderHook(useModalContext, {
      wrapper: createModalContextWrapper(props),
    });

    expect(result.current).toHaveProperty(
      'tabs',
      ([] as ModalContextProviderProps['tabs']).concat(props.tabs).map((tab) => {
        if (tab.initialState) {
          delete tab.initialState;
        }

        return tab;
      })
    );

    expect(result.current).toHaveProperty(
      'state',
      expect.objectContaining({
        meta: expect.objectContaining({ selectedTabId: props.defaultSelectedTabId }),
        test: {},
      })
    );

    expect(result.current).toHaveProperty('dispatch', expect.any(Function));
  });

  it('invocating the context dispatch function causes state changes for the selected tab state', () => {
    const SUT_DISPATCH_ACTION = {
      type: 'TEST_ACTION',
      payload: 'state_update',
    };

    const props: ModalContextProviderProps = {
      tabs: [
        {
          id: 'test',
          name: 'Test',
          reducer: (state = {}, action) => {
            switch (action.type) {
              case SUT_DISPATCH_ACTION.type:
                return {
                  ...state,
                  sut: action.payload,
                };
              default:
                return state;
            }
          },
        },
      ],
      defaultSelectedTabId: 'test',
    };

    const { result } = renderHook(useModalContext, {
      wrapper: createModalContextWrapper(props),
    });

    expect(result.current).toHaveProperty(
      'state',
      expect.objectContaining({
        test: {},
      })
    );

    act(() => {
      result.current.dispatch(SUT_DISPATCH_ACTION);
    });

    expect(result.current).toHaveProperty(
      'state',
      expect.objectContaining({
        test: {
          sut: SUT_DISPATCH_ACTION.payload,
        },
      })
    );
  });
});
