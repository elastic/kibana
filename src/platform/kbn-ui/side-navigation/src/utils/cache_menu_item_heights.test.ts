/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cacheMenuItemHeights } from './cache_menu_item_heights';
import type { MenuItem } from '../../types';

const createMenuItem = (id: string): MenuItem => ({
  id,
  label: id,
  href: `/${id}`,
  iconType: 'empty',
});

describe('cacheMenuItemHeights', () => {
  it('stores the heights when the rendered elements match the items', () => {
    const heights = [42, 58];
    const items = heights.map((_, index) => createMenuItem(`item-${index}`));
    const menu = document.createElement('div');

    heights.forEach((height) => {
      const child = document.createElement('div');

      Object.defineProperty(child, 'clientHeight', {
        configurable: true,
        value: height,
      });
      menu.appendChild(child);
    });

    const ref = { current: [] };

    cacheMenuItemHeights(ref, menu, items);

    expect(ref.current).toEqual(heights);
  });

  it('leaves the cache untouched when not all children are rendered yet', () => {
    const items = [createMenuItem('item-0'), createMenuItem('item-1')];
    const menu = document.createElement('div');
    const child = document.createElement('div');

    Object.defineProperty(child, 'clientHeight', {
      configurable: true,
      value: 50,
    });

    menu.appendChild(child);

    const ref = { current: [75] };

    cacheMenuItemHeights(ref, menu, items);

    expect(ref.current).toEqual([75]);
  });
});
