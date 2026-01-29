/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { MetricField } from '../../../types';
import { DIMENSIONS_COLUMN } from './constants';
import { createESQLQuery } from './create_esql_query';
import { ES_FIELD_TYPES } from '@kbn/field-types';

const mockMetric: MetricField = {
  name: 'cpu.usage',
  type: 'gauge',
  index: 'metrics-*',
  dimensions: [
    { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
    { name: 'container.id', type: ES_FIELD_TYPES.KEYWORD },
    { name: 'host.ip', type: ES_FIELD_TYPES.IP },
    { name: 'cpu.cores', type: ES_FIELD_TYPES.LONG },
    { name: 'region', type: ES_FIELD_TYPES.KEYWORD },
  ],
};

const mockCounterMetric: MetricField = {
  ...mockMetric,
  name: 'requests.count',
  instrument: 'counter',
};

describe('createESQLQuery', () => {
  it('should generate a basic AVG query for a metric field', () => {
    const query = createESQLQuery({ metric: mockMetric });
    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });

  it('should generate a SUM query for counter instrument', () => {
    const query = createESQLQuery({
      metric: mockCounterMetric,
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
      metric: mockMetric,
      splitAccessors: ['host.name'],
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`host.name\`
`.trim()
    );
  });

  it('should handle multiple dimensions with CONCAT', () => {
    const query = createESQLQuery({
      metric: mockMetric,
      splitAccessors: ['host.name', 'container.id'],
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`host.name\`, \`container.id\`
  | EVAL ${DIMENSIONS_COLUMN} = CONCAT(\`host.name\`, " › ", \`container.id\`)
  | DROP \`host.name\`, \`container.id\`
`.trim()
    );
  });

  it('should handle multiple dimensions with IP field', () => {
    const query = createESQLQuery({
      metric: mockMetric,
      splitAccessors: ['host.ip', 'host.name'],
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`host.ip\`, \`host.name\`
  | EVAL ${DIMENSIONS_COLUMN} = CONCAT(\`host.ip\`, " › ", \`host.name\`)
  | DROP \`host.ip\`, \`host.name\`
`.trim()
    );
  });

  it('should handle multiple dimensions with numeric field', () => {
    const query = createESQLQuery({
      metric: mockMetric,
      splitAccessors: ['cpu.cores', 'host.name'],
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`cpu.cores\`, \`host.name\`
  | EVAL ${DIMENSIONS_COLUMN} = CONCAT(\`cpu.cores\`, " › ", \`host.name\`)
  | DROP \`cpu.cores\`, \`host.name\`
`.trim()
    );
  });

  it('should handle multiple dimensions with mixed field types', () => {
    const query = createESQLQuery({
      metric: mockMetric,
      splitAccessors: ['host.ip', 'host.name', 'cpu.cores'],
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`host.ip\`, \`host.name\`, \`cpu.cores\`
  | EVAL ${DIMENSIONS_COLUMN} = CONCAT(\`host.ip\`, " › ", \`host.name\`, " › ", \`cpu.cores\`)
  | DROP \`host.ip\`, \`host.name\`, \`cpu.cores\`
`.trim()
    );
  });

  it('should override index if provided in metric', () => {
    const query = createESQLQuery({
      metric: { ...mockMetric, index: 'custom-metrics-*' },
    });
    expect(query).toBe(
      `
TS custom-metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });

  it('should handle undefined splitAccessors without throwing error', () => {
    const query = createESQLQuery({
      metric: mockMetric,
      splitAccessors: undefined,
    });

    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });

  it('should prepend WHERE commands before STATS', () => {
    const query = createESQLQuery({
      metric: mockMetric,
      whereStatements: ['host.name == "host-01" AND system.cpu.user.pct IS NOT NULL'],
    });

    expect(query).toBe(
      `
TS metrics-*
  | WHERE host.name == "host-01" AND system.cpu.user.pct IS NOT NULL
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });

  it('should ignore empty WHERE statements', () => {
    const query = createESQLQuery({
      metric: mockMetric,
      whereStatements: ['  ', '', '\n\t'],
    });

    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });
  it('should handle empty splitAccessors array', () => {
    const query = createESQLQuery({
      metric: mockMetric,
      splitAccessors: [],
    });

    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });

  describe('special character escaping', () => {
    it('should escape field names with hyphens in single dimension', () => {
      const query = createESQLQuery({
        metric: mockMetric,
        splitAccessors: ['service-name'],
      });
      expect(query).toBe(
        `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`service-name\`
`.trim()
      );
    });

    it('should escape field names with hyphens in multiple dimensions', () => {
      const query = createESQLQuery({
        metric: mockMetric,
        splitAccessors: ['service-name', 'container-id'],
      });
      expect(query).toBe(
        `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`service-name\`, \`container-id\`
  | EVAL ${DIMENSIONS_COLUMN} = CONCAT(\`service-name\`, " › ", \`container-id\`)
  | DROP \`service-name\`, \`container-id\`
`.trim()
      );
    });

    it('should escape field names with hyphens in multiple dimensions with IP field', () => {
      const query = createESQLQuery({
        metric: mockMetric,
        splitAccessors: ['host-ip', 'service-name'],
      });
      expect(query).toBe(
        `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`host-ip\`, \`service-name\`
  | EVAL ${DIMENSIONS_COLUMN} = CONCAT(\`host-ip\`, " › ", \`service-name\`)
  | DROP \`host-ip\`, \`service-name\`
`.trim()
      );
    });

    it('should escape field names with backticks by doubling them', () => {
      const query = createESQLQuery({
        metric: mockMetric,
        splitAccessors: ['field`with`ticks'],
      });
      expect(query).toBe(
        `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`field\`\`with\`\`ticks\`
`.trim()
      );
    });
  });
});
