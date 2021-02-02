/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ObjectToConfigAdapter } from './object_to_config_adapter';

describe('ObjectToConfigAdapter', () => {
  describe('#getFlattenedPaths()', () => {
    it('considers arrays as final values', () => {
      const data = {
        string: 'string',
        array: ['an', 'array'],
      };
      const config = new ObjectToConfigAdapter(data);

      expect(config.getFlattenedPaths()).toEqual(['string', 'array']);
    });

    it('handles nested arrays', () => {
      const data = {
        string: 'string',
        array: ['an', 'array'],
        nested: {
          number: 12,
          array: [{ key: 1 }, { key: 2 }],
        },
      };
      const config = new ObjectToConfigAdapter(data);

      expect(config.getFlattenedPaths()).toEqual([
        'string',
        'array',
        'nested.number',
        'nested.array',
      ]);
    });
  });
});
