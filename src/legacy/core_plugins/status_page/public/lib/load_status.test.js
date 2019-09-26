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

import './load_status.test.mocks';
import loadStatus from './load_status';

// A faked response to the `fetch` call
const mockFetch = async () => ({
  status: 200,
  json: async () => ({
    name: 'My computer',
    status: {
      overall: {
        state: 'yellow', title: 'Yellow'
      },
      statuses: [
        { id: 'plugin:1', state: 'green', title: 'Green', message: 'Ready', uiColor: 'secondary' },
        { id: 'plugin:2', state: 'yellow', title: 'Yellow', message: 'Something is weird', uiColor: 'warning' }
      ],
    },
    metrics: {
      collection_interval_in_millis: 1000,
      os: { load: {
        '1m': 4.1,
        '5m': 2.1,
        '15m': 0.1,
      } },

      process: { memory: { heap: {
        size_limit: 1000000,
        used_in_bytes: 100
      } } },

      response_times: {
        avg_in_millis: 4000,
        max_in_millis: 8000
      },

      requests: {
        total: 400
      }
    }
  })
});

describe('response processing', () => {
  test('includes the name', async () => {
    const data = await loadStatus(mockFetch);
    expect(data.name).toEqual('My computer');
  });

  test('includes the plugin statuses', async () => {
    const data = await loadStatus(mockFetch);
    expect(data.statuses).toEqual([
      { id: 'plugin:1', state: { id: 'green', title: 'Green', message: 'Ready', uiColor: 'secondary' } },
      { id: 'plugin:2', state: { id: 'yellow', title: 'Yellow', message: 'Something is weird', uiColor: 'warning' } }
    ]);
  });

  test('includes the serverState', async () => {
    const data = await loadStatus(mockFetch);
    expect(data.serverState).toEqual({ id: 'yellow', title: 'Yellow' });
  });

  test('builds the metrics', async () => {
    const data = await loadStatus(mockFetch);
    const names = data.metrics.map(m => m.name);
    expect(names).toEqual([
      'Heap total',
      'Heap used',
      'Load',
      'Response time avg',
      'Response time max',
      'Requests per second'
    ]);

    const values = data.metrics.map(m => m.value);
    expect(values).toEqual([
      1000000,
      100,
      [4.1, 2.1, 0.1],
      4000,
      8000,
      400
    ]);
  });
});
