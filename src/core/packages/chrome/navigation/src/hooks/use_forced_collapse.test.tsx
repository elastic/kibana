/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useIsWithinBreakpoints } from '@elastic/eui';

import { useForcedCollapse } from './use_forced_collapse';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useIsWithinBreakpoints: jest.fn(),
  };
});

const mockUseIsWithinBreakpoints = useIsWithinBreakpoints as jest.MockedFunction<
  typeof useIsWithinBreakpoints
>;

describe('useForcedCollapse', () => {
  let observers: MockResizeObserver[];
  let originalResizeObserver: typeof ResizeObserver | undefined;
  let hadOriginalResizeObserver: boolean;

  class MockResizeObserver {
    public readonly observe = jest.fn();
    public readonly disconnect = jest.fn();

    constructor(private readonly callback: ResizeObserverCallback) {
      observers.push(this);
    }

    trigger(width: number) {
      this.callback([{ contentRect: { width } } as ResizeObserverEntry], this);
    }
  }

  beforeEach(() => {
    observers = [];
    mockUseIsWithinBreakpoints.mockReturnValue(false);
    hadOriginalResizeObserver = 'ResizeObserver' in globalThis;
    originalResizeObserver = globalThis.ResizeObserver;

    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: MockResizeObserver,
    });
  });

  afterEach(() => {
    if (hadOriginalResizeObserver && originalResizeObserver) {
      Object.defineProperty(globalThis, 'ResizeObserver', {
        configurable: true,
        writable: true,
        value: originalResizeObserver,
      });
    } else {
      delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    }

    mockUseIsWithinBreakpoints.mockReset();
  });

  it('keeps the default EUI breakpoint behavior', () => {
    mockUseIsWithinBreakpoints.mockReturnValue(true);

    const { result, rerender } = renderHook(() => useForcedCollapse());

    expect(result.current).toBe(true);

    mockUseIsWithinBreakpoints.mockReturnValue(false);
    rerender();

    expect(result.current).toBe(false);
  });

  it('forces collapse from container width and releases with hysteresis', async () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      value: 900,
    });

    const { result } = renderHook(() =>
      useForcedCollapse({
        mode: 'containerWidth',
        getContainer: () => container,
        collapseAtWidth: 1000,
        expandAtWidth: 1100,
      })
    );

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    const resizeObserver = observers[observers.length - 1];
    expect(resizeObserver.observe).toHaveBeenCalledWith(container);

    act(() => {
      Object.defineProperty(container, 'clientWidth', {
        configurable: true,
        value: 1050,
      });
      resizeObserver.trigger(1050);
    });

    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(container, 'clientWidth', {
        configurable: true,
        value: 1150,
      });
      resizeObserver.trigger(1150);
    });

    expect(result.current).toBe(false);
  });
});
