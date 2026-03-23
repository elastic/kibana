/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flattenOptions } from './get_action_options';

describe('flattenOptions', () => {
  it('should flatten options', () => {
    const nestedOptions = [
      {
        id: '1',
        iconType: 'group',
        label: 'Group',
        options: [
          {
            id: '1.1',
            iconType: 'nested',
            label: 'Nested Option',
            options: [{ id: '1.1.1', iconType: 'nested', label: 'Nested Nested Option' }],
          },
        ],
      },
    ];
    const flattenedOptions = flattenOptions(nestedOptions);
    expect(flattenedOptions).toContainEqual(
      expect.objectContaining({
        id: '1.1.1',
        label: 'Nested Nested Option',
      })
    );
    expect(flattenedOptions).toContainEqual(
      expect.objectContaining({
        id: '1.1',
        label: 'Nested Option',
      })
    );
    expect(flattenedOptions).toContainEqual(
      expect.objectContaining({
        id: '1',
        label: 'Group',
      })
    );
  });
});
