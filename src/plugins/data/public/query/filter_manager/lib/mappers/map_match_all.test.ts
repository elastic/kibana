/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapMatchAll } from './map_match_all';
import { MatchAllFilter } from '../../../../../common';

describe('filter_manager/lib', () => {
  describe('mapMatchAll()', () => {
    let filter: MatchAllFilter;

    beforeEach(() => {
      filter = {
        match_all: {},
        meta: {
          alias: null,
          negate: true,
          disabled: false,
          field: 'foo',
          formattedValue: 'bar',
        },
      };
    });

    describe('when given a filter that is not match_all', () => {
      test('filter is rejected', async (done) => {
        delete filter.match_all;

        try {
          mapMatchAll(filter);
        } catch (e) {
          expect(e).toBe(filter);
          done();
        }
      });
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
