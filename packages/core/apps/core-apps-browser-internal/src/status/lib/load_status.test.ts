/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { StatusResponse } from '@kbn/core-status-common-internal';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { mocked } from '@kbn/core-metrics-collectors-server-mocks';
import { loadStatus } from './load_status';

const mockedResponse: StatusResponse = {
  name: 'My computer',
  uuid: 'uuid',
  version: {
    number: '8.0.0',
    build_hash: '9007199254740991',
    build_number: 12,
    build_snapshot: false,
    build_date: '2023-05-15T23:12:09.000Z',
    build_flavor: 'traditional',
  },
  status: {
    overall: {
      level: 'degraded',
      summary: 'yellow',
    },
    core: {
      elasticsearch: {
        level: 'available',
        summary: 'Elasticsearch is available',
      },
      savedObjects: {
        level: 'available',
        summary: 'SavedObjects service has completed migrations and is available',
      },
    },
    plugins: {
      plugin1: {
        level: 'available',
        summary: 'Ready',
      },
      plugin2: {
        level: 'degraded',
        summary: 'Something is weird',
      },
    },
  },
  metrics: {
    last_updated: '2020-01-01 01:00:00',
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
    elasticsearch_client: {
      totalActiveSockets: 25,
      totalIdleSockets: 2,
      totalQueuedRequests: 0,
    },
    process: {
      pid: 1,
      memory: {
        heap: {
          size_limit: 1000000,
          used_in_bytes: 100,
          total_in_bytes: 0,
        },
        resident_set_size_in_bytes: 1,
        array_buffers_in_bytes: 1,
        external_in_bytes: 1,
      },
      event_loop_delay: 1,
      event_loop_delay_histogram: mocked.createHistogram(),
      event_loop_utilization: {
        active: 1,
        idle: 1,
        utilization: 1,
      },
      uptime_in_millis: 1,
    },
    processes: [
      {
        pid: 1,
        memory: {
          heap: {
            size_limit: 1000000,
            used_in_bytes: 100,
            total_in_bytes: 0,
          },
          resident_set_size_in_bytes: 1,
          array_buffers_in_bytes: 1,
          external_in_bytes: 1,
        },
        event_loop_delay: 1,
        event_loop_delay_histogram: mocked.createHistogram(),
        event_loop_utilization: {
          active: 1,
          idle: 1,
          utilization: 1,
        },
        uptime_in_millis: 1,
      },
    ],
    response_times: {
      avg_in_millis: 4000,
      max_in_millis: 8000,
    },
    requests: {
      disconnects: 1,
      total: 400,
      statusCodes: {},
      status_codes: {},
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

  test('throws when an error occurs', async () => {
    http.get.mockReset();

    http.get.mockRejectedValue(new Error());

    await expect(loadStatus({ http, notifications })).rejects.toThrowError();
    expect(notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
  });

  test('throws when a 503 occurs which does not contain an appropriate payload', async () => {
    const error = new Error() as any;
    error.response = { status: 503 };
    error.body = {};

    http.get.mockReset();
    http.get.mockRejectedValue(error);

    await expect(loadStatus({ http, notifications })).rejects.toThrowError();
    expect(notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
  });

  test('does not throw when a 503 occurs which contains an appropriate payload', async () => {
    const error = new Error() as any;
    error.response = { status: 503 };
    error.body = mockedResponse;

    http.get.mockReset();
    http.get.mockRejectedValue(error);

    const data = await loadStatus({ http, notifications });
    expect(data.name).toEqual('My computer');
  });

  test('throws when a non-503 occurs which contains an appropriate payload', async () => {
    const error = new Error() as any;
    error.response = { status: 500 };
    error.body = mockedResponse;

    http.get.mockReset();
    http.get.mockRejectedValue(error);

    await expect(loadStatus({ http, notifications })).rejects.toThrowError();
    expect(notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
  });

  test('includes core statuses', async () => {
    const data = await loadStatus({ http, notifications });
    expect(data.coreStatus).toEqual([
      {
        id: 'elasticsearch',
        state: {
          id: 'available',
          title: 'Green',
          message: 'Elasticsearch is available',
          uiColor: 'success',
        },
        original: mockedResponse.status.core.elasticsearch,
      },
      {
        id: 'savedObjects',
        state: {
          id: 'available',
          title: 'Green',
          message: 'SavedObjects service has completed migrations and is available',
          uiColor: 'success',
        },
        original: mockedResponse.status.core.savedObjects,
      },
    ]);
  });

  test('includes the plugin statuses', async () => {
    const data = await loadStatus({ http, notifications });

    expect(data.pluginStatus).toEqual([
      {
        id: 'plugin1',
        state: { id: 'available', title: 'Green', message: 'Ready', uiColor: 'success' },
        original: mockedResponse.status.plugins.plugin1,
      },
      {
        id: 'plugin2',
        state: {
          id: 'degraded',
          title: 'Yellow',
          message: 'Something is weird',
          uiColor: 'warning',
        },
        original: mockedResponse.status.plugins.plugin2,
      },
    ]);
  });

  test('includes the serverState', async () => {
    const data = await loadStatus({ http, notifications });
    expect(data.serverState).toEqual({
      id: 'degraded',
      title: 'Yellow',
      message: 'yellow',
      uiColor: 'warning',
    });
  });

  test('builds the metrics', async () => {
    const data = await loadStatus({ http, notifications });
    const names = data.metrics.map((m) => m.name);
    expect(names).toEqual([
      'Heap used out of 976.56 KB',
      'Requests per second',
      'Utilization (active: 1.00 / idle: 1.00)',
      'Load',
      'Delay',
      'Response time avg',
    ]);
    const values = data.metrics.map((m) => m.value);
    expect(values).toEqual([100, 400, 1, [4.1, 2.1, 0.1], 1, 4000]);
  });

  test('adds meta details to Load, Delay and Response time', async () => {
    const data = await loadStatus({ http, notifications });
    const metricNames = data.metrics.filter((met) => met.meta);
    expect(metricNames.map((item) => item.name)).toEqual(['Load', 'Delay', 'Response time avg']);
    expect(metricNames.map((item) => item.meta!.description)).toEqual([
      'Load interval',
      'Percentiles',
      'Response time max',
    ]);
  });
});
