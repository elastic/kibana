/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { MetricField } from '../../../types';
import {
  createESQLQuery,
  createM4ESQLQuery,
  createM4DownsampledESQLQuery,
  createRawESQLQuery,
} from './create_esql_query';
import { M4_VALUE_COLUMN } from './create_aggregation';
import { ES_FIELD_TYPES } from '@kbn/field-types';

const mockMetric: MetricField = {
  name: 'cpu.usage',
  type: ES_FIELD_TYPES.DOUBLE,
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

const mockTdigestMetric: MetricField = {
  ...mockMetric,
  name: 'http.request.duration',
  type: ES_FIELD_TYPES.TDIGEST,
  instrument: 'histogram',
};

const mockExponentialHistogramMetric: MetricField = {
  ...mockMetric,
  name: 'http.request.duration',
  type: ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM,
  instrument: 'histogram',
};

const mockLegacyHistogramMetric: MetricField = {
  ...mockMetric,
  name: 'histogram.legacy',
  type: ES_FIELD_TYPES.HISTOGRAM,
  instrument: 'histogram',
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

  it('should generate a PERCENTILE query for histogram instrument with exponential_histogram type', () => {
    const query = createESQLQuery({
      metric: mockExponentialHistogramMetric,
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS PERCENTILE(http.request.duration, 95) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });

  it('should generate a PERCENTILE query for histogram instrument with tdigest type', () => {
    const query = createESQLQuery({
      metric: mockTdigestMetric,
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS PERCENTILE(http.request.duration, 95) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });

  it('should generate a PERCENTILE query for legacy histogram', () => {
    const query = createESQLQuery({
      metric: mockLegacyHistogramMetric,
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS PERCENTILE(TO_TDIGEST(histogram.legacy), 95) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });

  it('should generate a PERCENTILE query for legacy histogram with multiple dimensions', () => {
    const query = createESQLQuery({
      metric: mockLegacyHistogramMetric,
      splitAccessors: ['service.name', 'host.name'],
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS PERCENTILE(TO_TDIGEST(histogram.legacy), 95) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`service.name\`, \`host.name\`
`.trim()
    );
  });

  it('should generate exponential histogram query with single dimension', () => {
    const query = createESQLQuery({
      metric: mockExponentialHistogramMetric,
      splitAccessors: ['service.name'],
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS PERCENTILE(http.request.duration, 95) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`service.name\`
`.trim()
    );
  });

  it('should generate exponential histogram query with multiple dimensions', () => {
    const query = createESQLQuery({
      metric: mockExponentialHistogramMetric,
      splitAccessors: ['service.name', 'host.name'],
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS PERCENTILE(http.request.duration, 95) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`service.name\`, \`host.name\`
`.trim()
    );
  });

  it('should generate tdigest histogram query with single dimension', () => {
    const query = createESQLQuery({
      metric: mockTdigestMetric,
      splitAccessors: ['service.name'],
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS PERCENTILE(http.request.duration, 95) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`service.name\`
`.trim()
    );
  });

  it('should generate tdigest histogram query with multiple dimensions', () => {
    const query = createESQLQuery({
      metric: mockTdigestMetric,
      splitAccessors: ['service.name', 'host.name'],
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS PERCENTILE(http.request.duration, 95) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`service.name\`, \`host.name\`
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

  it('should handle multiple dimensions', () => {
    const query = createESQLQuery({
      metric: mockMetric,
      splitAccessors: ['host.name', 'container.id'],
    });
    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`host.name\`, \`container.id\`
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
    const mockMetricWithSpecialChars: MetricField = {
      name: 'cpu.usage',
      type: ES_FIELD_TYPES.LONG,
      index: 'metrics-*',
      dimensions: [
        { name: 'service-name', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'container-id', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'host-ip', type: ES_FIELD_TYPES.IP },
      ],
    };

    it('should escape field names with hyphens in single dimension', () => {
      const query = createESQLQuery({
        metric: mockMetricWithSpecialChars,
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
`.trim()
      );
    });

    it('should escape field names with backticks by doubling them', () => {
      const mockMetricWithBackticks: MetricField = {
        name: 'cpu.usage',
        type: ES_FIELD_TYPES.DOUBLE,
        index: 'metrics-*',
        dimensions: [{ name: 'field`with`ticks', type: ES_FIELD_TYPES.KEYWORD }],
      };

      const query = createESQLQuery({
        metric: mockMetricWithBackticks,
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

describe('createM4ESQLQuery', () => {
  it('should generate an M4 query with STATS, MV_EXPAND unrolling, and SORT', () => {
    const query = createM4ESQLQuery({ metric: mockMetric });

    expect(query).toContain('FROM metrics-*');
    expect(query).toContain('first_t = MIN(@timestamp)');
    expect(query).toContain('first_t_v = TOP(@timestamp, 1, "asc", `cpu.usage`)');
    expect(query).toContain('last_t_v = TOP(@timestamp, 1, "desc", `cpu.usage`)');
    expect(query).toContain('min_v = MIN(`cpu.usage`)');
    expect(query).toContain('max_v = MAX(`cpu.usage`)');
    expect(query).toContain('EVAL idx = [0, 1, 2, 3]');
    expect(query).toContain('MV_EXPAND idx');
    expect(query).toContain(`KEEP @timestamp, ${M4_VALUE_COLUMN}`);
    expect(query).toContain('SORT @timestamp ASC');
    expect(query).toContain('LIMIT 400');
  });

  it('should use custom targetBuckets', () => {
    const query = createM4ESQLQuery({ metric: mockMetric, targetBuckets: 500 });

    expect(query).toContain('BUCKET(@timestamp, 500, ?_tstart, ?_tend)');
    expect(query).toContain('LIMIT 2000');
  });

  it('should prepend WHERE statements', () => {
    const query = createM4ESQLQuery({
      metric: mockMetric,
      whereStatements: ['host.name == "host-01"'],
    });

    expect(query).toContain('WHERE host.name == "host-01"');
    expect(query).toContain('STATS');
    const whereIndex = query.indexOf('WHERE');
    const statsIndex = query.indexOf('STATS');
    expect(whereIndex).toBeLessThan(statsIndex);
  });

  it('should ignore empty WHERE statements', () => {
    const query = createM4ESQLQuery({
      metric: mockMetric,
      whereStatements: ['  ', ''],
    });

    expect(query).not.toContain('WHERE');
  });

  it('should use the metric index', () => {
    const query = createM4ESQLQuery({
      metric: { ...mockMetric, index: 'custom-metrics-*' },
    });

    expect(query).toContain('FROM custom-metrics-*');
  });

  it('should properly escape metric field names', () => {
    const query = createM4ESQLQuery({
      metric: { ...mockMetric, name: 'system.load.1m' },
    });

    expect(query).toContain('`system.load.1m`');
  });
});

describe('createM4DownsampledESQLQuery', () => {
  it('should generate a two-stage AVG → M4 query', () => {
    const query = createM4DownsampledESQLQuery({
      metric: mockMetric,
      sourceBuckets: 1000,
      targetBuckets: 100,
    });

    expect(query).toContain('FROM metrics-*');
    expect(query).toContain('STATS agg_val = AVG(cpu.usage) BY _ts = BUCKET(@timestamp, 1000');
    expect(query).toContain('first_t = MIN(_ts)');
    expect(query).toContain('first_t_v = TOP(_ts, 1, "asc", agg_val)');
    expect(query).toContain('min_v = MIN(agg_val)');
    expect(query).toContain(`KEEP @timestamp, ${M4_VALUE_COLUMN}`);
    expect(query).toContain('SORT @timestamp ASC');
    expect(query).toContain('LIMIT 400');
  });

  it('should use SUM(RATE()) for counter instruments', () => {
    const query = createM4DownsampledESQLQuery({ metric: mockCounterMetric });

    expect(query).toContain('STATS agg_val = SUM(RATE(requests.count))');
  });

  it('should chain the two STATS stages in order', () => {
    const query = createM4DownsampledESQLQuery({ metric: mockMetric });

    const firstStats = query.indexOf('STATS agg_val');
    const secondStats = query.indexOf('STATS', firstStats + 1);
    expect(firstStats).toBeGreaterThan(-1);
    expect(secondStats).toBeGreaterThan(firstStats);
  });

  it('should output @timestamp as the final timestamp column', () => {
    const query = createM4DownsampledESQLQuery({ metric: mockMetric });

    expect(query).toContain('KEEP @timestamp, value');
    expect(query).toContain('SORT @timestamp ASC');
  });

  it('should prepend WHERE statements before both STATS stages', () => {
    const query = createM4DownsampledESQLQuery({
      metric: mockMetric,
      whereStatements: ['host.name == "host-01"'],
    });

    const whereIndex = query.indexOf('WHERE');
    const firstStats = query.indexOf('STATS');
    expect(whereIndex).toBeLessThan(firstStats);
  });
});

describe('createRawESQLQuery', () => {
  it('should generate a raw query with KEEP, SORT, and LIMIT', () => {
    const query = createRawESQLQuery({ metric: mockMetric });

    expect(query).toContain('FROM metrics-*');
    expect(query).toContain('KEEP @timestamp, `cpu.usage`');
    expect(query).toContain('SORT @timestamp ASC');
    expect(query).toContain('LIMIT 10000');
  });

  it('should use a custom limit', () => {
    const query = createRawESQLQuery({ metric: mockMetric, limit: 5000 });

    expect(query).toContain('LIMIT 5000');
  });

  it('should prepend WHERE statements', () => {
    const query = createRawESQLQuery({
      metric: mockMetric,
      whereStatements: ['host.name == "host-01"'],
    });

    expect(query).toContain('WHERE host.name == "host-01"');
    const whereIndex = query.indexOf('WHERE');
    const keepIndex = query.indexOf('KEEP');
    expect(whereIndex).toBeLessThan(keepIndex);
  });

  it('should ignore empty WHERE statements', () => {
    const query = createRawESQLQuery({
      metric: mockMetric,
      whereStatements: ['  ', ''],
    });

    expect(query).not.toContain('WHERE');
  });

  it('should use the metric index', () => {
    const query = createRawESQLQuery({
      metric: { ...mockMetric, index: 'custom-metrics-*' },
    });

    expect(query).toContain('FROM custom-metrics-*');
  });

  it('should properly escape metric field names', () => {
    const query = createRawESQLQuery({
      metric: { ...mockMetric, name: 'system.load.1m' },
    });

    expect(query).toContain('KEEP @timestamp, `system.load.1m`');
  });
});
