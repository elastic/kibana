/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ParsedMetricItem } from '../../../types';
import { createESQLQuery } from './create_esql_query';
import { ES_FIELD_TYPES } from '@kbn/field-types';

const mockMetric: ParsedMetricItem = {
  metricName: 'cpu.usage',
  fieldTypes: [ES_FIELD_TYPES.DOUBLE],
  dataStream: 'metrics-*',
  units: ['ms'],
  metricTypes: ['histogram'],
  dimensionFields: [
    { name: 'host.name' },
    { name: 'container.id' },
    { name: 'host.ip' },
    { name: 'cpu.cores' },
    { name: 'region' },
  ],
};

const mockCounterMetric: ParsedMetricItem = {
  ...mockMetric,
  metricName: 'requests.count',
  metricTypes: ['counter'],
};

const mockTdigestMetric: ParsedMetricItem = {
  ...mockMetric,
  metricName: 'http.request.duration',
  fieldTypes: [ES_FIELD_TYPES.TDIGEST],
  metricTypes: ['histogram'],
};

const mockExponentialHistogramMetric: ParsedMetricItem = {
  ...mockMetric,
  metricName: 'http.request.duration',
  fieldTypes: [ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM],
  metricTypes: ['histogram'],
};

const mockLegacyHistogramMetric: ParsedMetricItem = {
  ...mockMetric,
  metricName: 'histogram.legacy',
  fieldTypes: [ES_FIELD_TYPES.HISTOGRAM],
  metricTypes: ['histogram'],
};

describe('createESQLQuery', () => {
  it('should generate a basic AVG query for a metric field', () => {
    const query = createESQLQuery({ metricItem: mockMetric });
    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });

  it('should generate a SUM query for counter instrument', () => {
    const query = createESQLQuery({
      metricItem: mockCounterMetric,
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
      metricItem: mockExponentialHistogramMetric,
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
      metricItem: mockTdigestMetric,
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
      metricItem: mockLegacyHistogramMetric,
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
      metricItem: mockLegacyHistogramMetric,
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
      metricItem: mockExponentialHistogramMetric,
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
      metricItem: mockExponentialHistogramMetric,
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
      metricItem: mockTdigestMetric,
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
      metricItem: mockTdigestMetric,
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
      metricItem: mockMetric,
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
      metricItem: mockMetric,
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
      metricItem: mockMetric,
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
      metricItem: mockMetric,
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
      metricItem: mockMetric,
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
      metricItem: { ...mockMetric, dataStream: 'custom-metrics-*' },
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
      metricItem: mockMetric,
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
      metricItem: mockMetric,
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

  it('should preserve multiple non-empty WHERE statements and ignore empty entries', () => {
    const query = createESQLQuery({
      metricItem: mockMetric,
      splitAccessors: ['host.name'],
      whereStatements: [' host.name == "host-01" ', '', 'cpu.cores > 4', '   '],
    });

    expect(query).toBe(
      `
TS metrics-*
  | WHERE host.name == "host-01"
  | WHERE cpu.cores > 4
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`host.name\`
`.trim()
    );
  });

  it('should ignore empty WHERE statements', () => {
    const query = createESQLQuery({
      metricItem: mockMetric,
      whereStatements: ['  ', '', '\n\t'],
    });

    expect(query).toBe(
      `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
    );
  });

  it('should handle undefined whereStatements without throwing error', () => {
    const query = createESQLQuery({
      metricItem: mockMetric,
      whereStatements: undefined,
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
      metricItem: mockMetric,
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
    const mockMetricWithSpecialChars: ParsedMetricItem = {
      metricName: 'cpu.usage',
      fieldTypes: [ES_FIELD_TYPES.LONG],
      dataStream: 'metrics-*',
      units: ['ms'],
      metricTypes: ['histogram'],
      dimensionFields: [{ name: 'service-name' }, { name: 'container-id' }, { name: 'host-ip' }],
    };

    it('should escape field names with hyphens in single dimension', () => {
      const query = createESQLQuery({
        metricItem: mockMetricWithSpecialChars,
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
        metricItem: mockMetric,
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
        metricItem: mockMetric,
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
      const mockMetricWithBackticks: ParsedMetricItem = {
        metricName: 'cpu.usage',
        fieldTypes: [ES_FIELD_TYPES.DOUBLE],
        dataStream: 'metrics-*',
        units: ['ms'],
        metricTypes: ['histogram'],
        dimensionFields: [{ name: 'field`with`ticks' }],
      };

      const query = createESQLQuery({
        metricItem: mockMetricWithBackticks,
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

  describe('conflicting field types (issue #5385)', () => {
    const mockMetricWithConflictingTypes: ParsedMetricItem = {
      metricName: 'http.request.duration',
      fieldTypes: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.FLOAT],
      dataStream: 'timeseries-rich-metrics-primary',
      units: ['ms'],
      metricTypes: ['gauge'],
      dimensionFields: [{ name: 'service.name' }],
    };

    it('should cast conflicting double+float types to TO_DOUBLE', () => {
      const query = createESQLQuery({
        metricItem: mockMetricWithConflictingTypes,
      });
      expect(query).toBe(
        `
TS timeseries-rich-metrics-primary
  | STATS AVG(TO_DOUBLE(http.request.duration)) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
      );
    });

    it('should cast conflicting types with single dimension', () => {
      const query = createESQLQuery({
        metricItem: mockMetricWithConflictingTypes,
        splitAccessors: ['service.name'],
      });
      expect(query).toBe(
        `
TS timeseries-rich-metrics-primary
  | STATS AVG(TO_DOUBLE(http.request.duration)) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), \`service.name\`
`.trim()
      );
    });

    it('should cast conflicting long+integer types to TO_LONG', () => {
      const mockMetricWithLongConflict: ParsedMetricItem = {
        metricName: 'requests.count',
        fieldTypes: [ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.INTEGER],
        dataStream: 'metrics-*',
        units: ['count'],
        metricTypes: ['counter'],
        dimensionFields: [],
      };

      const query = createESQLQuery({
        metricItem: mockMetricWithLongConflict,
      });
      expect(query).toBe(
        `
TS metrics-*
  | STATS SUM(RATE(TO_LONG(requests.count))) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
      );
    });

    it('should cast mixed numeric types (double+long) to TO_DOUBLE', () => {
      const mockMetricMixedNumeric: ParsedMetricItem = {
        metricName: 'metric.value',
        fieldTypes: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.LONG],
        dataStream: 'metrics-*',
        units: ['count'],
        metricTypes: ['gauge'],
        dimensionFields: [],
      };

      const query = createESQLQuery({
        metricItem: mockMetricMixedNumeric,
      });
      expect(query).toBe(
        `
TS metrics-*
  | STATS AVG(TO_DOUBLE(metric.value)) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
      );
    });

    it('should handle conflicting types with WHERE statements', () => {
      const query = createESQLQuery({
        metricItem: mockMetricWithConflictingTypes,
        whereStatements: ['service.name == "api-server"'],
      });
      expect(query).toBe(
        `
TS timeseries-rich-metrics-primary
  | WHERE service.name == "api-server"
  | STATS AVG(TO_DOUBLE(http.request.duration)) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
      );
    });

    it('should not cast when all types are identical', () => {
      const mockMetricSingleType: ParsedMetricItem = {
        metricName: 'cpu.usage',
        fieldTypes: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.DOUBLE],
        dataStream: 'metrics-*',
        units: ['percent'],
        metricTypes: ['gauge'],
        dimensionFields: [],
      };

      const query = createESQLQuery({
        metricItem: mockMetricSingleType,
      });
      expect(query).toBe(
        `
TS metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
      );
    });

    it('should pass incompatible histogram types through for Lens to handle', () => {
      const mockMetricWithConflictingHistogram: ParsedMetricItem = {
        metricName: 'request.duration',
        fieldTypes: [ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM, ES_FIELD_TYPES.TDIGEST],
        dataStream: 'metrics-*',
        units: ['ms'],
        metricTypes: ['histogram'],
        dimensionFields: [],
      };

      const query = createESQLQuery({
        metricItem: mockMetricWithConflictingHistogram,
      });
      // Incompatible types are passed through uncast so Lens can
      // surface its own error message
      expect(query).toBe(
        `
TS metrics-*
  | STATS PERCENTILE(request.duration, 95) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)
`.trim()
      );
    });
  });
});
