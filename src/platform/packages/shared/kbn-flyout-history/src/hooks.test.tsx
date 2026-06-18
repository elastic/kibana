/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { getFlyoutManagerStore } from '@elastic/eui';
import { FlyoutHistoryProvider } from './history_provider';
import { useCloseHistoryGroup, useGoBack, useGoToFlyout } from './hooks';

jest.mock('@elastic/eui', () => ({
  // Keep real context objects so Provider/Consumer work correctly in tests.
  ...jest.requireActual('@elastic/eui'),
  getFlyoutManagerStore: jest.fn(),
}));

const mockGetFlyoutManagerStore = getFlyoutManagerStore as jest.MockedFunction<
  typeof getFlyoutManagerStore
>;

const makeStore = (
  sessions: Array<{ mainFlyoutId: string; historyKey: symbol }> = [],
  overrides: Partial<ReturnType<typeof getFlyoutManagerStore>> = {}
) =>
  ({
    getState: () => ({ sessions }),
    closeFlyout: jest.fn(),
    goBack: jest.fn(),
    goToFlyout: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    ...overrides,
  } as unknown as ReturnType<typeof getFlyoutManagerStore>);

describe('useCloseHistoryGroup', () => {
  it('does nothing when rendered outside a FlyoutHistoryProvider', () => {
    const store = makeStore([{ mainFlyoutId: 'flyout-1', historyKey: Symbol('key') }]);
    mockGetFlyoutManagerStore.mockReturnValue(store);

    const { result } = renderHook(() => useCloseHistoryGroup());
    act(() => result.current());

    expect(store.closeFlyout).not.toHaveBeenCalled();
  });

  it('closes only flyouts matching the provider historyKey', () => {
    const myKey = Symbol('my-group');
    const otherKey = Symbol('other-group');
    const store = makeStore([
      { mainFlyoutId: 'flyout-mine', historyKey: myKey },
      { mainFlyoutId: 'flyout-other', historyKey: otherKey },
    ]);
    mockGetFlyoutManagerStore.mockReturnValue(store);

    const { result } = renderHook(() => useCloseHistoryGroup(), {
      wrapper: ({ children }) => (
        <FlyoutHistoryProvider historyKey={myKey}>{children}</FlyoutHistoryProvider>
      ),
    });

    act(() => result.current());

    expect(store.closeFlyout).toHaveBeenCalledTimes(1);
    expect(store.closeFlyout).toHaveBeenCalledWith('flyout-mine');
  });

  it('closes all sessions that share the same historyKey', () => {
    const sharedKey = Symbol('shared');
    const store = makeStore([
      { mainFlyoutId: 'flyout-a', historyKey: sharedKey },
      { mainFlyoutId: 'flyout-b', historyKey: sharedKey },
    ]);
    mockGetFlyoutManagerStore.mockReturnValue(store);

    const { result } = renderHook(() => useCloseHistoryGroup(), {
      wrapper: ({ children }) => (
        <FlyoutHistoryProvider historyKey={sharedKey}>{children}</FlyoutHistoryProvider>
      ),
    });

    act(() => result.current());

    expect(store.closeFlyout).toHaveBeenCalledTimes(2);
    expect(store.closeFlyout).toHaveBeenCalledWith('flyout-a');
    expect(store.closeFlyout).toHaveBeenCalledWith('flyout-b');
  });
});

describe('useGoBack', () => {
  it('calls store.goBack()', () => {
    const store = makeStore();
    mockGetFlyoutManagerStore.mockReturnValue(store);

    const { result } = renderHook(() => useGoBack());
    act(() => result.current());

    expect(store.goBack).toHaveBeenCalledTimes(1);
  });

  it('is stable across re-renders', () => {
    const store = makeStore();
    mockGetFlyoutManagerStore.mockReturnValue(store);

    const { result, rerender } = renderHook(() => useGoBack());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

describe('useGoToFlyout', () => {
  it('calls store.goToFlyout() with the provided flyout ID', () => {
    const store = makeStore();
    mockGetFlyoutManagerStore.mockReturnValue(store);

    const { result } = renderHook(() => useGoToFlyout());
    act(() => result.current('flyout-123'));

    expect(store.goToFlyout).toHaveBeenCalledWith('flyout-123');
  });
});
