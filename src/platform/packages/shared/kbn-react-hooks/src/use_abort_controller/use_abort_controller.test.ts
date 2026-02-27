/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useAbortController } from './use_abort_controller';

describe('useAbortController', () => {
  it('should return a valid signal and abort function', () => {
    const { result } = renderHook(() => useAbortController());

    // Verify initial state
    expect(result.current.signal).toBeDefined();
    expect(result.current.signal.aborted).toBe(false);

    // Call abort and test if signal becomes aborted
    act(() => {
      result.current.abort();
    });
    expect(result.current.signal.aborted).toBe(true);
  });

  it('should refresh with a new AbortController after calling refresh', () => {
    const { result } = renderHook(() => useAbortController());

    // Capture initial signal
    const initialSignal = result.current.signal;

    // Abort the initial controller
    act(() => {
      result.current.abort();
    });
    expect(initialSignal.aborted).toBe(true);

    // Refresh to get a new controller
    act(() => {
      result.current.refresh();
    });
    // The new controller should not be aborted
    expect(result.current.signal.aborted).toBe(false);
    expect(result.current.signal).not.toBe(initialSignal);
  });

  it('should abort when the component is unmounted', () => {
    const { result, unmount } = renderHook(() => useAbortController());
    // Capture the initial signal before unmounting
    const initialSignal = result.current.signal;
    unmount();
    expect(initialSignal.aborted).toBe(true);
  });
});
