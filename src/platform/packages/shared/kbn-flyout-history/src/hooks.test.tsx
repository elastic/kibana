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
import { useCloseHistoryGroup } from './hooks';

jest.mock('@elastic/eui', () => ({
  getFlyoutManagerStore: jest.fn(),
}));

const mockGetFlyoutManagerStore = getFlyoutManagerStore as jest.MockedFunction<
  typeof getFlyoutManagerStore
>;

const mockFlyoutManagerStore = (
  store: Pick<ReturnType<typeof getFlyoutManagerStore>, 'getState' | 'closeFlyout'>
) => {
  mockGetFlyoutManagerStore.mockReturnValue(
    store as unknown as ReturnType<typeof getFlyoutManagerStore>
  );
};

describe('useCloseHistoryGroup', () => {
  const makeStore = (sessions: Array<{ mainFlyoutId: string; historyKey: symbol }>) => ({
    getState: () =>
      ({ sessions } as ReturnType<ReturnType<typeof getFlyoutManagerStore>['getState']>),
    closeFlyout: jest.fn(),
  });

  it('does nothing when rendered outside a FlyoutHistoryProvider', () => {
    const store = makeStore([{ mainFlyoutId: 'flyout-1', historyKey: Symbol('key') }]);
    mockFlyoutManagerStore(store);

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
    mockFlyoutManagerStore(store);

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
    mockFlyoutManagerStore(store);

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
