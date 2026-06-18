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
import { FlyoutHistoryProvider } from './history_provider';
import { useFlyoutHistoryKey } from './history_context';

describe('useFlyoutHistoryKey', () => {
  it('returns undefined when rendered outside of a provider', () => {
    const { result } = renderHook(() => useFlyoutHistoryKey());
    expect(result.current).toBeUndefined();
  });

  it('returns the history key supplied to the provider', () => {
    const historyKey = Symbol('history');
    const { result } = renderHook(() => useFlyoutHistoryKey(), {
      wrapper: ({ children }) => (
        <FlyoutHistoryProvider historyKey={historyKey}>{children}</FlyoutHistoryProvider>
      ),
    });
    expect(result.current).toBe(historyKey);
  });
});
