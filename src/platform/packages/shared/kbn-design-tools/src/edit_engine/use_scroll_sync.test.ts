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
import { ElementRegistry } from './element_registry';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
import { makeSession } from '../lib/tests/helpers';

describe('useScrollSync', () => {
  let registry: ElementRegistry;
  let registryRef: MutableRefObject<ElementRegistry>;
  let scrollContainer: HTMLDivElement;

  beforeEach(() => {
    registry = new ElementRegistry();
    registryRef = { current: registry };

    scrollContainer = document.createElement('div');
    scrollContainer.id = APP_MAIN_SCROLL_CONTAINER_ID;
    document.body.appendChild(scrollContainer);
  });

  afterEach(() => {
    scrollContainer.remove();
  });

  const makeScrollSession = (left: number, top: number) => {
    const el = document.createElement('div');
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    document.body.appendChild(el);
    return makeSession({ el, originalRect: new DOMRect(left, top, 100, 100) });
  };

  const scroll = (x: number, y: number) => {
    Object.defineProperty(scrollContainer, 'scrollLeft', { value: x, configurable: true });
    Object.defineProperty(scrollContainer, 'scrollTop', { value: y, configurable: true });
    act(() => {
      scrollContainer.dispatchEvent(new Event('scroll'));
    });
  };

  it('should attach a scroll listener to the main scroll container', () => {
    const addSpy = jest.spyOn(scrollContainer, 'addEventListener');
    renderHook(() => useScrollSync(registryRef));
    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    addSpy.mockRestore();
  });

  it('should adjust all managed elements on scroll', () => {
    const session = makeScrollSession(100, 200);
    registry.set(session);

    renderHook(() => useScrollSync(registryRef));

    scroll(10, 20);

    expect(session.el.style.left).toBe('90px');
    expect(session.el.style.top).toBe('180px');

    scroll(0, 0);
    session.el.remove();
  });

  it('should adjust live elements the same as clones', () => {
    const liveSession = { ...makeScrollSession(100, 200), isDuplicate: true };
    registry.set(liveSession);

    renderHook(() => useScrollSync(registryRef));

    scroll(10, 20);

    expect(liveSession.el.style.left).toBe('90px');
    expect(liveSession.el.style.top).toBe('180px');

    scroll(0, 0);
    liveSession.el.remove();
  });

  it('should clean up listener on unmount', () => {
    const removeSpy = jest.spyOn(scrollContainer, 'removeEventListener');
    const { unmount } = renderHook(() => useScrollSync(registryRef));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    removeSpy.mockRestore();
  });
});
