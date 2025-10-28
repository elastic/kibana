/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import { metricStateSchema } from './metric';

describe('Metric Schema', () => {
  const baseMetricConfig = {
    type: 'metric',
    dataset: {
      type: 'dataView',
      id: 'test-data-view',
    },
  };

  const defaultValues = {
    sampling: 1,
    ignore_global_filters: false,
  };

  describe('primary metric configuration', () => {
    it('validates count metric operation', () => {
      const input = {
        ...baseMetricConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          fit: false,
          sub_label: 'Count of records',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          alignments: {
            labels: 'left',
            value: 'right',
          },
        },
      };

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates metric with icon configuration', () => {
      const input = {
        ...baseMetricConfig,
        metric: {
          operation: 'sum',
          field: 'price',
          fit: false,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          icon: {
            name: 'visMetric',
            align: 'left',
          },
          alignments: { labels: 'left', value: 'left' },
        },
      };

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
      });
    });

    it('validates metric with color configuration', () => {
      const input = {
        ...baseMetricConfig,
        metric: {
          operation: 'average',
          field: 'temperature',
          fit: false,
          alignments: { labels: 'left', value: 'left' },
          color: {
            type: 'dynamic',
            range: 'absolute',
            steps: [
              { type: 'from', from: 0, color: '#blue' },
              { type: 'to', to: 100, color: '#red' },
            ],
          },
        },
      };

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates metric with background chart', () => {
      const input = {
        ...baseMetricConfig,
        metric: {
          operation: 'max',
          field: 'cpu_usage',
          fit: false,
          alignments: { labels: 'left', value: 'left' },
          background_chart: {
            type: 'bar',
            direction: 'horizontal',
            goal_value: {
              operation: 'static_value',
              value: 80,
            },
          },
        },
      };

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('should throw for invalid color by value configuration', () => {
      const input = {
        ...baseMetricConfig,
        metric: {
          operation: 'average',
          field: 'temperature',
          color: {
            type: 'dynamic',
            range: 'percentage',
            steps: [
              { type: 'from', from: 0, color: '#blue' },
              { type: 'to', to: 100, color: '#red' },
            ],
          },
          fit: false,
          alignments: { labels: 'left', value: 'left' },
        },
      };

      expect(() => metricStateSchema.validate(input)).toThrow();
    });
  });

  describe('secondary metric configuration', () => {
    it('validates with secondary metric', () => {
      const input = {
        ...baseMetricConfig,
        metric: {
          operation: 'sum',
          field: 'revenue',
          fit: false,
          alignments: { labels: 'left', value: 'left' },
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        secondary_metric: {
          operation: 'sum',
          field: 'cost',
          prefix: '$',
          compare: {
            to: 'primary',
          },
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
      };

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates with colored secondary metric', () => {
      const input = {
        ...baseMetricConfig,
        metric: {
          operation: 'sum',
          field: 'revenue',
          fit: false,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          alignments: { labels: 'left', value: 'left' },
        },
        secondary_metric: {
          operation: 'sum',
          field: 'profit',
          prefix: '',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          color: {
            type: 'static',
            color: '#green',
          },
        },
      };

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });

  describe('breakdown configuration', () => {
    it('validates terms breakdown', () => {
      const input = {
        ...baseMetricConfig,
        metric: {
          operation: 'sum',
          field: 'sales',
          fit: false,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          alignments: { labels: 'left', value: 'left' },
        },
        breakdown_by: {
          operation: 'terms',
          fields: ['category'],
          columns: 3,
          collapse_by: 'sum',
        },
      };

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        breakdown_by: { ...input.breakdown_by, size: 5 },
      });
    });

    it('validates date histogram breakdown', () => {
      const input = {
        ...baseMetricConfig,
        metric: {
          operation: 'sum',
          field: 'sales',
          fit: false,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          alignments: { labels: 'left', value: 'left' },
        },
        breakdown_by: {
          operation: 'date_histogram',
          field: 'timestamp',
          suggested_interval: 'auto',
          include_empty_rows: true,
          use_original_time_range: true,
          columns: 4,
          collapse_by: 'avg',
        },
      };

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });

  describe('validation errors', () => {
    it('throws on missing metric operation', () => {
      const input = {
        ...baseMetricConfig,
        metric: {
          field: 'test_field',
        },
      };

      expect(() => metricStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid alignment value', () => {
      const input = {
        ...baseMetricConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          alignments: {
            labels: 'invalid',
          },
        },
      };

      expect(() => metricStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid breakdown collapse_by value', () => {
      const input = {
        ...baseMetricConfig,
        metric: {
          operation: 'sum',
          field: 'sales',
        },
        breakdown_by: {
          operation: 'terms',
          fields: ['category'],
          collapse_by: 'invalid',
        },
      };

      expect(() => metricStateSchema.validate(input)).toThrow();
    });
  });

  describe('complex configurations', () => {
    it('validates full metric configuration', () => {
      const input = {
        ...baseMetricConfig,
        title: 'Sales Overview',
        description: 'Sales metrics breakdown by category',
        metric: {
          operation: 'sum',
          field: 'sales',
          sub_label: 'Total Sales',
          fit: false,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          alignments: {
            labels: 'left',
            value: 'right',
          },
          icon: {
            name: 'visMetric',
            align: 'right',
          },
          color: {
            type: 'dynamic',
            range: 'absolute',
            steps: [
              { type: 'from', from: 0, color: '#red' },
              { type: 'to', to: 1000, color: '#green' },
            ],
          },
          background_chart: {
            type: 'trend',
          },
        },
        secondary_metric: {
          operation: 'sum',
          field: 'profit',
          prefix: '$',
          compare: {
            to: 'primary',
          },
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        breakdown_by: {
          operation: 'terms',
          fields: ['category'],
          columns: 4,
          collapse_by: 'sum',
        },
      };

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        breakdown_by: { ...input.breakdown_by, size: 5 },
      });
    });

    it('validates esql configuration', () => {
      const input = {
        type: 'metric',
        dataset: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        metric: {
          operation: 'value',
          column: 'unique_count',
          fit: false,
          alignments: { labels: 'left', value: 'left' },
        },
      };

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });
});
