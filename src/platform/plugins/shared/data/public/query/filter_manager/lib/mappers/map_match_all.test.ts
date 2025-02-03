/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mapMatchAll } from './map_match_all';
import { MatchAllFilter } from '@kbn/es-query';

describe('filter_manager/lib', () => {
  describe('mapMatchAll()', () => {
    let filter: MatchAllFilter;

    beforeEach(() => {
      filter = {
        query: { match_all: {} },
        meta: {
          alias: null,
          negate: true,
          disabled: false,
          field: 'foo',
          formattedValue: 'bar',
        },
      };
    });

    describe('when given a match_all filter', () => {
      test('key is set to meta field', async () => {
        const result = mapMatchAll(filter);

        expect(result).toHaveProperty('key', filter.meta.field);
      });

      test('value is set to meta formattedValue', async () => {
        const result = mapMatchAll(filter);

        expect(result).toHaveProperty('value', filter.meta.formattedValue);
      });
    });
  });
});
