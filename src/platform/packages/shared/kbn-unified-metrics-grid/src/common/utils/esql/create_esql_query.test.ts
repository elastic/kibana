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
  it('should generate a basic AVG query for a metric field', () => {
    const query = createESQLQuery({ metricField: 'cpu.usage' });
    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });

  it('should generate a SUM query for counter instrument', () => {
    const query = createESQLQuery({
      metricField: 'requests.count',
      instrument: 'counter',
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS SUM(RATE(requests.count)) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });

  it('should handle single dimension', () => {
    const query = createESQLQuery({
      metricField: 'cpu.usage',
      dimensions: ['host.name'],
    });
    expect(query).toBe(
      `
TS metrics-*
  | WHERE host.name IS NOT NULL
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), host.name
  | RENAME host.name AS ${DIMENSIONS_COLUMN}
`.trim()
    );
  });

  it('should handle multiple dimensions', () => {
    const query = createESQLQuery({
      metricField: 'cpu.usage',
      dimensions: ['host.name', 'container.id'],
    });
    expect(query).toBe(
      `
TS metrics-*
  | WHERE host.name IS NOT NULL AND container.id IS NOT NULL
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), host.name, container.id
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
    });

    expect(query).toBe(
      `
TS metrics-*
  | WHERE host.name IN ("host-1", "host-2")
  | WHERE region IN ("us-east")
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });

  it('should apply default index if none is provided', () => {
    const query = createESQLQuery({ metricField: 'cpu.usage' });
    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });

  it('should override index if provided', () => {
    const query = createESQLQuery({
      metricField: 'cpu.usage',
      index: 'custom-metrics-*',
    });
    expect(query).toBe(
      `
TS custom-metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });
});
