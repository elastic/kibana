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

import _ from 'lodash';
import { computeDroppedTypes } from './compute_dropped_types';
import { getActiveMappings } from './get_active_mappings';

describe('computeDroppedTypes', () => {
  test('is empty if the index does not exist', async () => {
    const plugins = [
      {
        id: 'hoi',
        mappings: {
          foo: { type: 'text' },
        },
        migrations: { foo: { 1: _.identity } },
      },
    ];
    const result = await computeDroppedTypes({
      callCluster: mockCluster(),
      index: '.my-index',
      kibanaVersion: '9.1.2',
      plugins,
    });
    expect(result).toEqual({});
  });

  test('is empty if the index docs are all supported', async () => {
    const plugins = [
      {
        id: 'hoi',
        mappings: {
          foo: { type: 'text' },
        },
        migrations: { foo: { 1: _.identity } },
      },
    ];
    let count = 0;
    const activeMappings = _.mapValues(
      getActiveMappings({ kibanaVersion: '2.3.4', plugins }).doc.properties,
      () => ++count
    );
    const result = await computeDroppedTypes({
      callCluster: mockCluster({
        searchResult: createSearchResult(activeMappings),
      }),
      index: '.my-index',
      kibanaVersion: '9.5.2',
      plugins,
    });
    expect(result).toEqual({});
  });

  test('returns the doc counts for unsupported types', async () => {
    const plugins = [
      {
        id: 'hoi',
        mappings: {
          foo: { type: 'text' },
        },
        migrations: {
          bar: { 1: _.identity },
          foo: { 1: _.identity },
        },
      },
      {
        id: 'hrm',
        mappings: {
          goob: { type: 'text' },
          pea: { type: 'text' },
        },
      },
    ];
    const result = await computeDroppedTypes({
      callCluster: mockCluster({
        searchResult: createSearchResult({
          bar: 32,
          baz: 42,
          foo: 20,
          pea: 17,
          zed: 99,
        }),
      }),
      index: '.my-index',
      kibanaVersion: '1.2.3',
      plugins,
    });
    expect(result).toEqual({
      baz: 42,
      zed: 99,
    });
  });
});

function mockCluster({ searchResult }: any = {}) {
  return (action: string, args: any) => {
    switch (action) {
      case 'search':
        expect(args).toEqual({
          body: { size: 0, aggs: { types: { terms: { field: 'type' } } } },
          index: '.my-index',
        });
        return searchResult
          ? Promise.resolve(searchResult)
          : Promise.reject({ status: 404 });
      default:
        throw new Error(`Unexpected command ${action}`);
    }
  };
}

function createSearchResult(counts: any) {
  return {
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    aggregations: {
      types: {
        // tslint:disable-next-line:variable-name
        buckets: Object.entries(counts).map(([key, doc_count]) => ({
          key,
          // tslint:disable-next-line:object-literal-sort-keys
          doc_count,
        })),
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
      },
    },
    hits: { total: 23, max_score: 0, hits: [] },
    timed_out: false,
    took: 1,
  };
}
