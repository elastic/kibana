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

import { getSavedObjectsCounts } from './get_saved_object_counts';

describe('getSavedObjectsCounts', () => {
  test('Get all the saved objects equal to 0 because no results were found', async () => {
    const callCluster = jest.fn(() => ({}));

    const results = await getSavedObjectsCounts(callCluster as any, '.kibana');
    expect(results).toStrictEqual({
      dashboard: { total: 0 },
      visualization: { total: 0 },
      search: { total: 0 },
      index_pattern: { total: 0 },
      graph_workspace: { total: 0 },
      timelion_sheet: { total: 0 },
    });
  });

  test('Merge the zeros with the results', async () => {
    const callCluster = jest.fn(() => ({
      aggregations: {
        types: {
          buckets: [
            { key: 'dashboard', doc_count: 1 },
            { key: 'timelion-sheet', doc_count: 2 },
            { key: 'index-pattern', value: 2 }, // Malformed on purpose
            { key: 'graph_workspace', doc_count: 3 }, // already snake_cased
          ],
        },
      },
    }));

    const results = await getSavedObjectsCounts(callCluster as any, '.kibana');
    expect(results).toStrictEqual({
      dashboard: { total: 1 },
      visualization: { total: 0 },
      search: { total: 0 },
      index_pattern: { total: 0 },
      graph_workspace: { total: 3 },
      timelion_sheet: { total: 2 },
    });
  });
});
