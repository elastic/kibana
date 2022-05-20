/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpsMetrics } from '../types';
import { collectorMock } from '../collectors/mocks';
import { convertToMetricEvent } from './ops_metrics_event';

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
  processes: [
    {
      memory: { heap: { used_in_bytes: 100 } },
      uptime_in_millis: 1500,
      event_loop_delay: 50,
      event_loop_delay_histogram: { percentiles: { '50': 50, '75': 75, '95': 95, '99': 99 } },
    },
  ],
  os: {
    load: {
      '1m': 10,
      '5m': 20,
      '15m': 30,
    },
  },
} as unknown as Partial<OpsMetrics>;

describe('convertToMetricEvent', () => {
  let rawOpsMetrics: OpsMetrics;
  beforeEach(() => {
    rawOpsMetrics = createMockOpsMetrics(testMetrics);
  });
  it('drops process field', () => {
    const result = convertToMetricEvent(rawOpsMetrics);
    expect(Object.keys(result).indexOf('process')).toEqual(-1);
  });

  it('returns metrics unchanged', () => {
    const { process, ...rest } = rawOpsMetrics;
    const eventOpsMetrics = convertToMetricEvent(rawOpsMetrics);
    expect(eventOpsMetrics).toStrictEqual(rest);
  });
});
