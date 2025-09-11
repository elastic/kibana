/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DIMENSIONS_COLUMN } from './constants';
import { createESQLQuery } from './create_esql_query';

describe('createESQLQuery', () => {
  const baseTimeRange = { from: '2025-09-04T00:00:00Z', to: '2025-09-04T01:00:00Z' };

  it('should generate a basic AVG query for a metric field', () => {
    const query = createESQLQuery({ metricField: 'cpu.usage', timeRange: baseTimeRange });
    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, "2025-09-04T00:00:00Z", "2025-09-04T01:00:00Z")
`.trim()
    );
  });

  it('should generate a SUM query for counter instrument', () => {
    const query = createESQLQuery({
      metricField: 'requests.count',
      instrument: 'counter',
      timeRange: baseTimeRange,
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS SUM(RATE(requests.count)) BY BUCKET(@timestamp, 100, "2025-09-04T00:00:00Z", "2025-09-04T01:00:00Z")
`.trim()
    );
  });

  it('should handle single dimension', () => {
    const query = createESQLQuery({
      metricField: 'cpu.usage',
      dimensions: ['host.name'],
      timeRange: baseTimeRange,
    });
    expect(query).toBe(
      `
TS metrics-*
  | WHERE host.name IS NOT NULL
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, "2025-09-04T00:00:00Z", "2025-09-04T01:00:00Z"), host.name
  | RENAME host.name AS ${DIMENSIONS_COLUMN}
`.trim()
    );
  });

  it('should handle multiple dimensions', () => {
    const query = createESQLQuery({
      metricField: 'cpu.usage',
      dimensions: ['host.name', 'container.id'],
      timeRange: baseTimeRange,
    });
    expect(query).toBe(
      `
TS metrics-*
  | WHERE host.name IS NOT NULL AND container.id IS NOT NULL
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, "2025-09-04T00:00:00Z", "2025-09-04T01:00:00Z"), host.name, container.id
  | EVAL ${DIMENSIONS_COLUMN} = CONCAT(host.name, " › ", container.id)
  | DROP host.name, container.id
`.trim()
    );
  });

  it('should handle filters', () => {
    const query = createESQLQuery({
      metricField: 'cpu.usage',
      filters: [
        { field: 'host.name', value: 'host-1' },
        { field: 'host.name', value: 'host-2' },
        { field: 'region', value: 'us-east' },
      ],
      timeRange: baseTimeRange,
    });

    expect(query).toBe(
      `
TS metrics-*
  | WHERE host.name IN ("host-1", "host-2")
  | WHERE region IN ("us-east")
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, "2025-09-04T00:00:00Z", "2025-09-04T01:00:00Z")
`.trim()
    );
  });

  it('should apply default index if none is provided', () => {
    const query = createESQLQuery({ metricField: 'cpu.usage', timeRange: baseTimeRange });
    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, "2025-09-04T00:00:00Z", "2025-09-04T01:00:00Z")
`.trim()
    );
  });

  it('should override index if provided', () => {
    const query = createESQLQuery({
      metricField: 'cpu.usage',
      index: 'custom-metrics-*',
      timeRange: baseTimeRange,
    });
    expect(query).toBe(
      `
TS custom-metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, "2025-09-04T00:00:00Z", "2025-09-04T01:00:00Z")
`.trim()
    );
  });

  it('should use default time range if none provided', () => {
    const query = createESQLQuery({ metricField: 'cpu.usage' });
    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, NOW() - 15 minute, NOW())
`.trim()
    );
  });
});
