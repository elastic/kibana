/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
      test('filter is rejected', async done => {
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
