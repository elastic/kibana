/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getRegisteredAppMenuItems,
  registerAppMenuItemGenerator,
} from './app_menu_item_registry';

describe('app_menu_item_registry', () => {
  it('returns generated items and supports unregister', () => {
    const unregister = registerAppMenuItemGenerator(({ viewMode }) =>
      viewMode === 'edit'
        ? {
            id: 'prettify',
            order: 0,
            label: 'Prettify',
            iconType: 'brush',
            run: jest.fn(),
          }
        : undefined
    );

    expect(getRegisteredAppMenuItems({ viewMode: 'edit' })).toEqual([
      expect.objectContaining({ id: 'prettify', label: 'Prettify' }),
    ]);
    expect(getRegisteredAppMenuItems({ viewMode: 'view' })).toEqual([]);

    unregister();
    expect(getRegisteredAppMenuItems({ viewMode: 'edit' })).toEqual([]);
  });
});
