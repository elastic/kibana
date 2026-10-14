/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useModalKeyboard } from './use_modal_keyboard';

describe('useModalKeyboard', () => {
  const dispatch = (key: string, opts: Partial<KeyboardEventInit> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...opts,
    });
    document.dispatchEvent(event);
    return event;
  };

  it('should call onUndo on Cmd+Z', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    renderHook(() => useModalKeyboard(onUndo, onRedo));

    dispatch('z', { metaKey: true });

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).not.toHaveBeenCalled();
  });

  it('should call onRedo on Cmd+Shift+Z', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    renderHook(() => useModalKeyboard(onUndo, onRedo));

    dispatch('z', { metaKey: true, shiftKey: true });

    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('should call onUndo on Ctrl+Z', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    renderHook(() => useModalKeyboard(onUndo, onRedo));

    dispatch('z', { ctrlKey: true });

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('should call onRedo on Ctrl+Shift+Z', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    renderHook(() => useModalKeyboard(onUndo, onRedo));

    dispatch('z', { ctrlKey: true, shiftKey: true });

    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('should not trigger on plain Z without modifier', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    renderHook(() => useModalKeyboard(onUndo, onRedo));

    dispatch('z');

    expect(onUndo).not.toHaveBeenCalled();
    expect(onRedo).not.toHaveBeenCalled();
  });

  it('should remove the listener on unmount', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    const { unmount } = renderHook(() => useModalKeyboard(onUndo, onRedo));

    unmount();
    dispatch('z', { metaKey: true });

    expect(onUndo).not.toHaveBeenCalled();
  });

  it('should use capture phase to stop propagation', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    renderHook(() => useModalKeyboard(onUndo, onRedo));

    const bubbleListener = jest.fn();
    document.addEventListener('keydown', bubbleListener);

    dispatch('z', { metaKey: true });

    // The capture-phase listener should have stopped propagation
    // so the bubble-phase listener should not fire.
    expect(bubbleListener).not.toHaveBeenCalled();
    expect(onUndo).toHaveBeenCalledTimes(1);

    document.removeEventListener('keydown', bubbleListener);
  });
});
