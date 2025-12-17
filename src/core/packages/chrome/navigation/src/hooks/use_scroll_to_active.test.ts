/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';

import { useScrollToActive } from './use_scroll_to_active';

describe('useScrollToActive', () => {
  const originalRaf = window.requestAnimationFrame;

  beforeEach(() => {
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRaf;
  });

  it('scrolls the element into view when active', () => {
    const { result } = renderHook(() => useScrollToActive(true));

    const element = document.createElement('div');
    const scrollIntoView = jest.spyOn(element, 'scrollIntoView');

    result.current(element);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  });

  it('does nothing when the element is not active', () => {
    const { result } = renderHook(() => useScrollToActive(false));

    const element = document.createElement('div');
    const scrollIntoView = jest.spyOn(element, 'scrollIntoView');

    result.current(element);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
