/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';

import { useRafDebouncedCallback } from './use_raf_debounced';

describe('useRafDebouncedCallback', () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  beforeEach(() => {
    let rafId = 0;
    const callbacks = new Map<number, FrameRequestCallback>();

    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      rafId += 1;
      callbacks.set(rafId, cb);
      return rafId;
    };

    window.cancelAnimationFrame = (id: number) => {
      callbacks.delete(id);
    };

    (window as unknown as { __rafCallbacks?: Map<number, FrameRequestCallback> }).__rafCallbacks =
      callbacks;
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    delete (window as unknown as { __rafCallbacks?: Map<number, FrameRequestCallback> })
      .__rafCallbacks;
  });

  const flushFrames = () => {
    const callbacks = (window as unknown as { __rafCallbacks: Map<number, FrameRequestCallback> })
      .__rafCallbacks;
    callbacks.forEach((cb, id) => {
      callbacks.delete(id);
      cb(performance.now());
    });
  };

  it('executes the latest callback on the next animation frame', () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useRafDebouncedCallback(fn));

    act(() => {
      result.current[0]();
    });

    expect(fn).not.toHaveBeenCalled();

    flushFrames();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancels pending callbacks', () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useRafDebouncedCallback(fn));

    act(() => {
      result.current[0]();
      result.current[1]();
    });

    flushFrames();

    expect(fn).not.toHaveBeenCalled();
  });
});
