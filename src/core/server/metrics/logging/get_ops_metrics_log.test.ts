/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { OpsMetrics } from '..';
import { getEcsOpsMetricsLog } from './get_ops_metrics_log';

const createBaseOpsMetrics = () => ({
  collected_at: new Date('2020-01-01 01:00:00'),
  process: {
    memory: {
      heap: { total_in_bytes: 1, used_in_bytes: 1, size_limit: 1 },
      resident_set_size_in_bytes: 1,
    },
    event_loop_delay: 1,
    pid: 1,
    uptime_in_millis: 1,
  },
  os: {
    platform: 'darwin' as const,
    platformRelease: 'test',
    load: { '1m': 1, '5m': 1, '15m': 1 },
    memory: { total_in_bytes: 1, free_in_bytes: 1, used_in_bytes: 1 },
    uptime_in_millis: 1,
  },
  response_times: { avg_in_millis: 1, max_in_millis: 1 },
  requests: { disconnects: 1, total: 1, statusCodes: { '200': 1 } },
  concurrent_connections: 1,
});

function createMockOpsMetrics(testMetrics: any) {
  const base = createBaseOpsMetrics();
  return {
    ...base,
    ...testMetrics,
  };
}
const testMetrics = {
  process: {
    memory: { heap: { used_in_bytes: 100 } },
    uptime_in_millis: 1500,
    event_loop_delay: 50,
  },
  os: {
    load: {
      '1m': 10,
      '5m': 20,
      '15m': 30,
    },
  },
};
describe('getEcsOpsMetricsLog', () => {
  it('provides correctly formatted message', () => {
    const result = getEcsOpsMetricsLog(createMockOpsMetrics(testMetrics));
    expect(result.message).toMatchInlineSnapshot(
      `"memory: 100.0B uptime: 0:00:01 load: [10.00,20.00,30.00] delay: 50.000"`
    );
  });

  it('correctly formats process uptime', () => {
    const logMeta = getEcsOpsMetricsLog(createMockOpsMetrics(testMetrics));
    expect(logMeta.process.uptime).toEqual(1);
  });

  it('excludes values from the message if unavailable', () => {
    const baseMetrics = createBaseOpsMetrics();
    const missingMetrics = ({
      ...baseMetrics,
      process: {},
      os: {},
    } as unknown) as Partial<OpsMetrics>;
    const logMeta = getEcsOpsMetricsLog(missingMetrics);
    expect(logMeta.message).toMatchInlineSnapshot(`"   "`);
  });

  it('specifies correct ECS version', () => {
    const logMeta = getEcsOpsMetricsLog(createBaseOpsMetrics());
    expect(logMeta.ecs.version).toBe('1.7.0');
  });

  it('provides an ECS-compatible response', () => {
    const logMeta = getEcsOpsMetricsLog(createBaseOpsMetrics());
    expect(logMeta).toMatchInlineSnapshot(`
      Object {
        "category": Array [
          "process",
          "host",
        ],
        "ecs": Object {
          "version": "1.7.0",
        },
        "host": Object {
          "os": Object {
            "load": Object {
              "15m": 1,
              "1m": 1,
              "5m": 1,
            },
          },
        },
        "kind": "metric",
        "message": "memory: 1.0B  load: [1.00,1.00,1.00] delay: 1.000",
        "process": Object {
          "eventLoopDelay": 1,
          "memory": Object {
            "heap": Object {
              "usedInBytes": 1,
            },
          },
          "uptime": 0,
        },
      }
    `);
  });
});
