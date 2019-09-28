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

import { cloneDeep } from 'lodash';
import expect from '@kbn/expect';
import { FilterStateStore } from '@kbn/es-query';
import { buildSavedQueryFilter } from '../saved_query';
import filterSkeleton from '../../__fixtures__/filter_skeleton';

let expected;
describe('Filter Manager', function () {
  describe('Saved query filter builder', function () {
    beforeEach(() => {
      expected = cloneDeep(filterSkeleton);
    });

    it('should be a function', function () {
      expect(buildSavedQueryFilter).to.be.a(Function);
    });

    it('should return a saved query filter when passed a saved query id', function () {
      const savedQueryTestItem = {
        id: 'foo',
        attributes: {
          title: 'foo',
          description: 'bar',
          query: {
            language: 'kuery',
            query: 'response:200',
          },
          filters: [
            {
              query: {
                match_phrase: {
                  'extension.keyword': {
                    'query': 'css'
                  }
                }
              },
              $state: { store: FilterStateStore.APP_STATE },
              meta: {
                disabled: false,
                negate: false,
                alias: null,
              },
            },
          ],
          timefilter: {
            range: {
              timestamp: {
                gte: '1940-02-01T00:00:00.000Z',
                lte: '2000-02-01T00:00:00.000Z',
                format: 'strict_date_optional_time',
              }
            },
          }
        }
      };
      expected = { meta: { type: 'savedQuery', key: 'foo', params: { savedQuery: { ...savedQueryTestItem } }, saved_query: 'foo' } };
      const actual = buildSavedQueryFilter(savedQueryTestItem);
      expect(actual).to.eql(expected);
    });
  });
});
