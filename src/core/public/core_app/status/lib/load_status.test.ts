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

import { StatusResponse } from '../../../../types/status';
import { httpServiceMock } from '../../../http/http_service.mock';
import { notificationServiceMock } from '../../../notifications/notifications_service.mock';
import { loadStatus } from './load_status';

const mockedResponse: StatusResponse = {
  name: 'My computer',
  uuid: 'uuid',
  version: {
    number: '8.0.0',
    build_hash: '9007199254740991',
    build_number: '12',
    build_snapshot: 'XXXXXXXX',
  },
  status: {
    overall: {
      id: 'overall',
      state: 'yellow',
      title: 'Yellow',
      message: 'yellow',
      uiColor: 'secondary',
    },
    statuses: [
      {
        id: 'plugin:1',
        state: 'green',
        title: 'Green',
        message: 'Ready',
        uiColor: 'secondary',
      },
      {
        id: 'plugin:2',
        state: 'yellow',
        title: 'Yellow',
        message: 'Something is weird',
        uiColor: 'warning',
      },
    ],
  },
  metrics: {
    collection_interval_in_millis: 1000,
    os: {
      platform: 'darwin' as const,
      platformRelease: 'test',
      memory: { total_in_bytes: 1, free_in_bytes: 1, used_in_bytes: 1 },
      uptime_in_millis: 1,
      load: {
        '1m': 4.1,
        '5m': 2.1,
        '15m': 0.1,
      },
    },
    process: {
      memory: {
        heap: {
          size_limit: 1000000,
          used_in_bytes: 100,
          total_in_bytes: 0,
        },
        resident_set_size_in_bytes: 1,
      },
      event_loop_delay: 1,
      pid: 1,
      uptime_in_millis: 1,
    },
    response_times: {
      avg_in_millis: 4000,
      max_in_millis: 8000,
    },
    requests: {
      disconnects: 1,
      total: 400,
      statusCodes: {},
    },
    concurrent_connections: 1,
  },
};

describe('response processing', () => {
  let http: ReturnType<typeof httpServiceMock.createSetupContract>;
  let notifications: ReturnType<typeof notificationServiceMock.createSetupContract>;

  beforeEach(() => {
    http = httpServiceMock.createSetupContract();
    http.get.mockResolvedValue(mockedResponse);
    notifications = notificationServiceMock.createSetupContract();
  });

  test('includes the name', async () => {
    const data = await loadStatus({ http, notifications });
    expect(data.name).toEqual('My computer');
  });

  test('includes the plugin statuses', async () => {
    const data = await loadStatus({ http, notifications });
    expect(data.statuses).toEqual([
      {
        id: 'plugin:1',
        state: { id: 'green', title: 'Green', message: 'Ready', uiColor: 'secondary' },
      },
      {
        id: 'plugin:2',
        state: { id: 'yellow', title: 'Yellow', message: 'Something is weird', uiColor: 'warning' },
      },
    ]);
  });

  test('includes the serverState', async () => {
    const data = await loadStatus({ http, notifications });
    expect(data.serverState).toEqual({
      id: 'yellow',
      title: 'Yellow',
      message: 'yellow',
      uiColor: 'secondary',
    });
  });

  test('builds the metrics', async () => {
    const data = await loadStatus({ http, notifications });
    const names = data.metrics.map((m) => m.name);
    expect(names).toEqual([
      'Heap total',
      'Heap used',
      'Load',
      'Response time avg',
      'Response time max',
      'Requests per second',
    ]);

    const values = data.metrics.map((m) => m.value);
    expect(values).toEqual([1000000, 100, [4.1, 2.1, 0.1], 4000, 8000, 400]);
  });
});
