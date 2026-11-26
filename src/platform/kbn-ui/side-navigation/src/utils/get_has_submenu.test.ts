/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MenuItem, SecondaryMenuSection } from '../../types';

import { getHasMoreSubmenu, getHasSubmenu } from './get_has_submenu';

const createItem = (sections?: MenuItem['sections']): MenuItem => ({
  id: 'id',
  label: 'Label',
  href: '/label',
  iconType: 'empty',
  sections,
});

const section = (id: string): SecondaryMenuSection => ({
  id,
  items: [{ id: `${id}-item`, label: id, href: `/${id}` }],
});

describe('getHasSubmenu', () => {
  it('returns false when no sections are present', () => {
    expect(getHasSubmenu(createItem())).toBe(false);
  });

  it('returns true when the item has sections', () => {
    const item = createItem([
      {
        id: 'section-1',
        items: [
          {
            id: 'child-1',
            label: 'Child',
            href: '/child',
          },
        ],
      },
    ]);

    expect(getHasSubmenu(item)).toBe(true);
  });

  it('returns true when the item has supplementary sections', () => {
    expect(
      getHasSubmenu({ ...createItem(), supplementarySections: [section('supplementary')] })
    ).toBe(true);
  });
});

describe('getHasMoreSubmenu', () => {
  it('returns true only for structural sections', () => {
    expect(getHasMoreSubmenu(createItem())).toBe(false);
    expect(
      getHasMoreSubmenu({ ...createItem(), supplementarySections: [section('supplementary')] })
    ).toBe(false);
    expect(
      getHasMoreSubmenu(
        createItem([
          {
            id: 'section-1',
            items: [{ id: 'child-1', label: 'Child', href: '/child' }],
          },
        ])
      )
    ).toBe(true);
  });
});
