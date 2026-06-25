/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { FlyoutHistoryContext, useFlyoutHistoryKey, useHistoryItems } from './history_context';
import type { FlyoutHistoryContextValue, HistoryItem } from './history_context';

const item: HistoryItem = { title: 'Previous', onClick: jest.fn() };

const makeWrapper =
  (value: FlyoutHistoryContextValue) =>
  ({ children }: { children: React.ReactNode }) =>
    <FlyoutHistoryContext.Provider value={value}>{children}</FlyoutHistoryContext.Provider>;

describe('useFlyoutHistoryKey', () => {
  it('returns undefined when rendered outside of a provider', () => {
    const { result } = renderHook(() => useFlyoutHistoryKey());
    expect(result.current).toBeUndefined();
  });

  it('returns the history key supplied to the provider', () => {
    const historyKey = Symbol('history');
    const { result } = renderHook(() => useFlyoutHistoryKey(), {
      wrapper: makeWrapper({ historyKey, historyItems: [] }),
    });
    expect(result.current).toBe(historyKey);
  });
});

describe('useHistoryItems', () => {
  it('returns an empty array when rendered outside of a provider', () => {
    const { result } = renderHook(() => useHistoryItems());
    expect(result.current).toEqual([]);
  });

  it('returns the history items supplied to the provider', () => {
    const historyKey = Symbol('history');
    const { result } = renderHook(() => useHistoryItems(), {
      wrapper: makeWrapper({ historyKey, historyItems: [item] }),
    });
    expect(result.current).toEqual([item]);
  });
});
