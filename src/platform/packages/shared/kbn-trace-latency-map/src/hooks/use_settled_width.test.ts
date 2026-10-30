/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { useSettledWidth } from './use_settled_width';

describe('useSettledWidth', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('follows the first measure at once', () => {
    const { result, rerender } = renderHook(({ width }) => useSettledWidth(width, 250), {
      initialProps: { width: 0 },
    });
    expect(result.current).toBe(0);
    rerender({ width: 800 });
    expect(result.current).toBe(800);
  });

  it('follows a resize only after it stops', () => {
    const { result, rerender } = renderHook(({ width }) => useSettledWidth(width, 250), {
      initialProps: { width: 800 },
    });
    rerender({ width: 700 });
    act(() => jest.advanceTimersByTime(200));
    rerender({ width: 600 });
    act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe(800);
    act(() => jest.advanceTimersByTime(60));
    expect(result.current).toBe(600);
  });
});
