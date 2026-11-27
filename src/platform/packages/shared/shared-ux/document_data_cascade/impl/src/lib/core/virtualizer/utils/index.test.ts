/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Virtualizer } from '@tanstack/react-virtual';
import { scrollToChildItem } from '.';

const createVirtualizer = (offset = 0, stickyPadding = 0) => {
  const element = document.createElement('div');
  Object.defineProperties(element, {
    clientHeight: { value: 500 },
    scrollHeight: { value: 10000 },
  });
  const instance = new Virtualizer<Element, Element>({
    count: 3,
    getScrollElement: () => element,
    estimateSize: () => 65,
    scrollMargin: 1000,
    scrollPaddingStart: stickyPadding,
    observeElementOffset: jest.fn(),
    observeElementRect: jest.fn(),
    scrollToFn: jest.fn(),
    initialRect: { width: 800, height: 500 },
    initialOffset: offset,
  });
  instance.scrollElement = element;
  instance.scrollOffset = offset;
  instance.scrollRect = { width: 800, height: 500 };
  instance.getTotalSize();
  const scroll = jest.spyOn(instance, 'scrollToOffset');
  return { instance, scroll };
};

describe('scrollToChildItem', () => {
  it.each([
    [0, 565],
    [1, 630],
    [2, 695],
  ])('scrolls match %i to its own bounds in a non-final group', (index, offset) => {
    const { instance, scroll } = createVirtualizer();
    scrollToChildItem(instance, index);
    expect(scroll).toHaveBeenCalledWith(offset, { align: 'start', behavior: 'auto' });
    expect(instance.options.scrollToFn).toHaveBeenLastCalledWith(
      offset,
      expect.anything(),
      instance
    );
  });

  it('avoids the native last-item shortcut to the bottom of the shared container', () => {
    const { instance, scroll } = createVirtualizer();
    expect(instance.getOffsetForIndex(2, 'auto')?.[0]).toBe(9500);
    scrollToChildItem(instance, 2);
    expect(scroll).toHaveBeenCalledWith(695, expect.anything());
  });

  it.each([0, 1, 2])(
    'positions match %i below the sticky header when scrolling upward',
    (index) => {
      const { instance, scroll } = createVirtualizer(1400, 60);
      scrollToChildItem(instance, index);
      expect(scroll).toHaveBeenCalledWith(940 + index * 65, expect.anything());
    }
  );

  it('leaves a fully visible match in place', () => {
    const { instance, scroll } = createVirtualizer(900, 60);
    scrollToChildItem(instance, 2);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('uses updated measurements and bottom padding', () => {
    const { instance, scroll } = createVirtualizer();
    instance.setOptions({ ...instance.options, scrollPaddingEnd: 30 });
    instance.resizeItem(0, 100);
    instance.resizeItem(1, 200);
    instance.resizeItem(2, 150);
    scrollToChildItem(instance, 2);
    expect(scroll).toHaveBeenCalledWith(980, expect.anything());
  });

  it('aligns a row taller than the viewport at the top', () => {
    const { instance, scroll } = createVirtualizer(900, 60);
    instance.resizeItem(1, 600);
    scrollToChildItem(instance, 1);
    expect(scroll).toHaveBeenCalledWith(1005, expect.anything());
  });

  it('does nothing for an empty list', () => {
    const { instance, scroll } = createVirtualizer();
    instance.setOptions({ ...instance.options, count: 0 });
    scrollToChildItem(instance, 0);
    expect(scroll).not.toHaveBeenCalled();
  });
});
