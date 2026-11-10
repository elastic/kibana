/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act, fireEvent } from '@testing-library/react';
import {
  useOverlayClickCapture,
  useThrottledDocumentPointerMove,
} from './use_overlay_pointer_events';

describe('useThrottledDocumentPointerMove', () => {
  let rafState: { id: number; cb: FrameRequestCallback | null };

  beforeEach(() => {
    rafState = { id: 0, cb: null };
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafState.id += 1;
      rafState.cb = cb;
      return rafState.id;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      if (id === rafState.id) {
        rafState.cb = null;
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const flushRaf = () => {
    const pending = rafState.cb;
    rafState.cb = null;
    pending?.(0);
  };

  it('throttles pointermove handler to requestAnimationFrame', () => {
    const handler = jest.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);

    renderHook(() => useThrottledDocumentPointerMove(handler));

    act(() => {
      fireEvent.pointerMove(target, { clientX: 1, clientY: 2 });
      fireEvent.pointerMove(target, { clientX: 1, clientY: 2 });
    });

    expect(handler).not.toHaveBeenCalled();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(rafState.cb).not.toBeNull();

    act(() => {
      flushRaf();
    });

    expect(handler).toHaveBeenCalledTimes(1);

    target.remove();
  });

  it('cancels a pending animation frame on unmount', () => {
    const handler = jest.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);

    const { unmount } = renderHook(() => useThrottledDocumentPointerMove(handler));

    act(() => {
      fireEvent.pointerMove(target, { clientX: 0, clientY: 0 });
    });

    expect(rafState.cb).not.toBeNull();
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(rafState.id);
    expect(rafState.cb).toBeNull();

    act(() => {
      flushRaf();
    });

    expect(handler).not.toHaveBeenCalled();

    target.remove();
  });
});

describe('useOverlayClickCapture', () => {
  it('calls onActivate on click after stopping propagation', () => {
    const onActivate = jest.fn();
    const target = document.createElement('button');
    document.body.appendChild(target);

    renderHook(() => useOverlayClickCapture({ onActivate }));

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(clickEvent, 'target', { value: target });
    const stopPropagation = jest.spyOn(clickEvent, 'stopPropagation');
    const preventDefault = jest.spyOn(clickEvent, 'preventDefault');

    act(() => {
      document.dispatchEvent(clickEvent);
    });

    expect(stopPropagation).toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
    expect(onActivate).toHaveBeenCalledWith(clickEvent);

    target.remove();
  });

  it('does not activate when shouldSkip returns true', () => {
    const onActivate = jest.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);

    renderHook(() =>
      useOverlayClickCapture({
        onActivate,
        shouldSkip: () => true,
      })
    );

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(clickEvent, 'target', { value: target });
    const stopPropagation = jest.spyOn(clickEvent, 'stopPropagation');

    act(() => {
      document.dispatchEvent(clickEvent);
    });

    expect(stopPropagation).not.toHaveBeenCalled();
    expect(onActivate).not.toHaveBeenCalled();

    target.remove();
  });

  it('activates on pointerdown when the target is a disabled HTMLElement', () => {
    const onActivate = jest.fn();
    const target = document.createElement('button');
    target.setAttribute('disabled', '');
    document.body.appendChild(target);

    renderHook(() => useOverlayClickCapture({ onActivate }));

    const pointerDownEvent = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    Object.defineProperty(pointerDownEvent, 'target', { value: target });

    act(() => {
      document.dispatchEvent(pointerDownEvent);
    });

    expect(onActivate).toHaveBeenCalledWith(pointerDownEvent);

    target.remove();
  });
});
