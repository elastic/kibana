/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useScrollSync } from './use_scroll_sync';
import { ElementRegistry } from '../lib/dom/element_registry';

describe('useScrollSync', () => {
  let registry: ElementRegistry;
  let registryRef: MutableRefObject<ElementRegistry>;

  beforeEach(() => {
    registry = new ElementRegistry();
    registryRef = { current: registry };
  });

  const makeSession = (left: number, top: number) => {
    const el = document.createElement('div');
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    document.body.appendChild(el);
    return {
      el,
      dx: 0,
      dy: 0,
      dw: 0,
      dh: 0,
      originalRect: {
        x: left,
        y: top,
        width: 100,
        height: 100,
        top,
        left,
        right: left + 100,
        bottom: top + 100,
        toJSON: () => ({}),
      } as DOMRect,
      isDuplicate: false,
    };
  };

  it('registers a capture-phase scroll listener', () => {
    const addSpy = jest.spyOn(document, 'addEventListener');
    renderHook(() => useScrollSync(registryRef));
    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    addSpy.mockRestore();
  });

  it('adjusts managed element positions on scroll', () => {
    const session = makeSession(100, 200);
    registry.set(session);

    renderHook(() => useScrollSync(registryRef));

    // First scroll establishes baseline
    act(() => {
      const event = new Event('scroll', { bubbles: true });
      Object.defineProperty(event, 'target', { value: document });
      document.dispatchEvent(event);
    });

    // Simulate scrolling by changing scrollTop
    Object.defineProperty(document.documentElement, 'scrollLeft', {
      value: 10,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'scrollTop', { value: 20, configurable: true });

    act(() => {
      const event = new Event('scroll', { bubbles: true });
      Object.defineProperty(event, 'target', { value: document });
      document.dispatchEvent(event);
    });

    expect(session.el.style.left).toBe('90px');
    expect(session.el.style.top).toBe('180px');

    // Clean up
    Object.defineProperty(document.documentElement, 'scrollLeft', { value: 0, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollTop', { value: 0, configurable: true });
    session.el.remove();
  });

  it('cleans up listener on unmount', () => {
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useScrollSync(registryRef));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    removeSpy.mockRestore();
  });
});
