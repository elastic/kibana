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
import type { FlyoutManagerStore } from '@elastic/eui';
import { FlyoutHistoryProvider } from './history_provider';
import { useHistoryItems } from './history_context';

jest.mock('@elastic/eui', () => ({
  // Keep real context objects so Provider/Consumer work correctly in tests.
  ...jest.requireActual('@elastic/eui'),
  getFlyoutManagerStore: jest.fn(),
}));

const mockGetFlyoutManagerStore = getFlyoutManagerStore as jest.MockedFunction<
  typeof getFlyoutManagerStore
>;

type Session = Parameters<FlyoutManagerStore['getState']> extends never
  ? never
  : ReturnType<FlyoutManagerStore['getState']>['sessions'][number];

const makeSession = (
  partial: Partial<Session> & { mainFlyoutId: string; historyKey: symbol }
): Session =>
  ({
    childFlyoutId: null,
    title: partial.mainFlyoutId,
    zIndex: 1000,
    childHistory: [],
    ...partial,
  } as Session);

const makeStore = (sessions: Session[], subscriber?: { notify: () => void }) => {
  const listeners = new Set<() => void>();

  const store = {
    getState: jest.fn(() => ({ sessions })),
    subscribe: jest.fn((l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    }),
    goToFlyout: jest.fn(),
    closeFlyout: jest.fn(),
    goBack: jest.fn(),
  } as unknown as FlyoutManagerStore;

  if (subscriber) {
    subscriber.notify = () => listeners.forEach((l) => l());
  }

  return store;
};

describe('FlyoutHistoryProvider — history state computation', () => {
  it.each([
    {
      name: 'no sessions exist',
      historyKey: Symbol('k'),
      sessions: [],
    },
    {
      name: 'active session belongs to a different historyKey',
      historyKey: Symbol('mine'),
      sessions: [makeSession({ mainFlyoutId: 'f1', historyKey: Symbol('other') })],
    },
  ])('returns empty items when $name', ({ historyKey, sessions }) => {
    mockGetFlyoutManagerStore.mockReturnValue(makeStore(sessions));

    const { result } = renderHook(() => useHistoryItems(), {
      wrapper: ({ children }) => (
        <FlyoutHistoryProvider historyKey={historyKey}>{children}</FlyoutHistoryProvider>
      ),
    });

    expect(result.current).toEqual([]);
  });

  it('returns a previous-session item when one exists in the same group', () => {
    const key = Symbol('k');
    const store = makeStore([
      makeSession({ mainFlyoutId: 'first', historyKey: key, title: 'First Flyout' }),
      makeSession({ mainFlyoutId: 'second', historyKey: key, title: 'Second Flyout' }),
    ]);
    mockGetFlyoutManagerStore.mockReturnValue(store);

    const { result } = renderHook(() => useHistoryItems(), {
      wrapper: ({ children }) => (
        <FlyoutHistoryProvider historyKey={key}>{children}</FlyoutHistoryProvider>
      ),
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].title).toBe('First Flyout');
  });

  it('returns child-history items for the current session (most recent first)', () => {
    const key = Symbol('k');
    const store = makeStore([
      makeSession({
        mainFlyoutId: 'main',
        historyKey: key,
        title: 'Main',
        childHistory: [
          { flyoutId: 'child-1', title: 'Child 1' },
          { flyoutId: 'child-2', title: 'Child 2' },
        ],
      }),
    ]);
    mockGetFlyoutManagerStore.mockReturnValue(store);

    const { result } = renderHook(() => useHistoryItems(), {
      wrapper: ({ children }) => (
        <FlyoutHistoryProvider historyKey={key}>{children}</FlyoutHistoryProvider>
      ),
    });

    // reversed: Child 2 first, then Child 1
    expect(result.current).toHaveLength(2);
    expect(result.current[0].title).toBe('Child 2');
    expect(result.current[1].title).toBe('Child 1');
  });

  it('recomputes items when the store notifies subscribers', () => {
    const key = Symbol('k');
    const subscriber = { notify: () => {} };
    const sessions: Session[] = [];
    const store = makeStore(sessions, subscriber);
    mockGetFlyoutManagerStore.mockReturnValue(store);

    const { result } = renderHook(() => useHistoryItems(), {
      wrapper: ({ children }) => (
        <FlyoutHistoryProvider historyKey={key}>{children}</FlyoutHistoryProvider>
      ),
    });

    expect(result.current).toEqual([]);

    // Add a previous + current session, then notify
    sessions.push(makeSession({ mainFlyoutId: 'prev', historyKey: key, title: 'Prev' }));
    sessions.push(makeSession({ mainFlyoutId: 'curr', historyKey: key, title: 'Curr' }));

    act(() => subscriber.notify());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].title).toBe('Prev');
  });
});
