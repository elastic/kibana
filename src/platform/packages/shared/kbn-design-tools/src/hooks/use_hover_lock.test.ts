/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useHoverLock } from './use_hover_lock';
import { CONTROLS_HEIGHT, LOCK_PADDING } from '../lib/constants';

describe('useHoverLock', () => {
  const makeElement = (rect: Partial<DOMRect>): HTMLElement => {
    const el = document.createElement('div');
    el.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 100,
        bottom: 50,
        width: 100,
        height: 50,
        x: 0,
        y: 0,
        toJSON: () => {},
        ...rect,
      } as DOMRect);
    return el;
  };

  it('returns false when no hover target is set', () => {
    const { result } = renderHook(() => useHoverLock(null));
    expect(result.current.isInsideHoverLock(50, 60)).toBe(false);
  });

  it('returns true for pointer in the controls zone below the element', () => {
    const el = makeElement({ left: 10, top: 20, right: 110, bottom: 70 });
    const { result } = renderHook(() => useHoverLock(el));

    // Just below the element bottom (70), within CONTROLS_HEIGHT
    const y = 75;
    expect(result.current.isInsideHoverLock(50, y)).toBe(true);
  });

  it('returns false for pointer above the element bottom', () => {
    const el = makeElement({ left: 10, top: 20, right: 110, bottom: 70 });
    const { result } = renderHook(() => useHoverLock(el));

    // Inside the element, not below it
    expect(result.current.isInsideHoverLock(50, 50)).toBe(false);
  });

  it('returns false for pointer too far below the controls zone', () => {
    const el = makeElement({ left: 10, top: 20, right: 110, bottom: 70 });
    const { result } = renderHook(() => useHoverLock(el));

    const y = 70 + CONTROLS_HEIGHT + LOCK_PADDING + 10;
    expect(result.current.isInsideHoverLock(50, y)).toBe(false);
  });

  it('respects horizontal padding', () => {
    const el = makeElement({ left: 10, top: 20, right: 110, bottom: 70 });
    const { result } = renderHook(() => useHoverLock(el));

    const y = 75; // in controls zone
    // Just outside left padding
    expect(result.current.isInsideHoverLock(10 - LOCK_PADDING - 1, y)).toBe(false);
    // Just inside left padding
    expect(result.current.isInsideHoverLock(10 - LOCK_PADDING, y)).toBe(true);
  });

  it('clearLock makes isInsideHoverLock return false', () => {
    const el = makeElement({ left: 10, top: 20, right: 110, bottom: 70 });
    const { result } = renderHook(() => useHoverLock(el));

    expect(result.current.isInsideHoverLock(50, 75)).toBe(true);

    act(() => {
      result.current.clearLock();
    });

    expect(result.current.isInsideHoverLock(50, 75)).toBe(false);
  });
});
