/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpsMetrics } from '..';
import { getEcsOpsMetricsLog } from './get_ops_metrics_log';
import { collectorMock } from '../collectors/mocks';

function createBaseOpsMetrics(): OpsMetrics {
  const mockProcess = collectorMock.createOpsProcessMetrics();

  return {
    collected_at: new Date('2020-01-01 01:00:00'),
    process: mockProcess,
    processes: [mockProcess],
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
  };
}

function createMockOpsMetrics(testMetrics: Partial<OpsMetrics>): OpsMetrics {
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
    event_loop_delay_histogram: { percentiles: { '50': 50, '75': 75, '95': 95, '99': 99 } },
  },
  os: {
    load: {
      '1m': 10,
      '5m': 20,
      '15m': 30,
    },
  },
} as unknown as Partial<OpsMetrics>;

describe('getEcsOpsMetricsLog', () => {
  it('provides correctly formatted message', () => {
    const result = getEcsOpsMetricsLog(createMockOpsMetrics(testMetrics));
    expect(result.message).toMatchInlineSnapshot(
      `"memory: 100.0B uptime: 0:00:01 load: [10.00,20.00,30.00] mean delay: 50.000 delay histogram: { 50: 50.000; 95: 95.000; 99: 99.000 }"`
    );
  });

  it('correctly formats process uptime', () => {
    const logMeta = getEcsOpsMetricsLog(createMockOpsMetrics(testMetrics));
    expect(logMeta.meta.process!.uptime).toEqual(1);
  });

  it('excludes values from the message if unavailable', () => {
    const baseMetrics = createBaseOpsMetrics();
    const missingMetrics = {
      ...baseMetrics,
      process: {},
      processes: [],
      os: {},
    } as unknown as OpsMetrics;
    const logMeta = getEcsOpsMetricsLog(missingMetrics);
    expect(logMeta.message).toMatchInlineSnapshot(`""`);
  });

  it('provides an ECS-compatible response', () => {
    const logMeta = getEcsOpsMetricsLog(createMockOpsMetrics(testMetrics));
    expect(logMeta.meta).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "category": Array [
            "process",
            "host",
          ],
          "kind": "metric",
          "type": Array [
            "info",
          ],
        },
        "host": Object {
          "os": Object {
            "load": Object {
              "15m": 30,
              "1m": 10,
              "5m": 20,
            },
          },
        },
        "process": Object {
          "eventLoopDelay": 50,
          "eventLoopDelayHistogram": Object {
            "50": 50,
            "95": 95,
            "99": 99,
          },
          "memory": Object {
            "heap": Object {
              "usedInBytes": 100,
            },
          },
          "uptime": 1,
        },
      }
    `);
  });

  it('logs ECS fields in the log meta', () => {
    const logMeta = getEcsOpsMetricsLog(createBaseOpsMetrics());
    expect(logMeta.meta.event!.kind).toBe('metric');
    expect(logMeta.meta.event!.category).toEqual(expect.arrayContaining(['process', 'host']));
    expect(logMeta.meta.event!.type).toEqual(expect.arrayContaining(['info']));
  });
});
