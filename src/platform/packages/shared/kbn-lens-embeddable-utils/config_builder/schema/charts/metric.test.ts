/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import type { MetricState } from './metric';
import { metricStateSchema } from './metric';

describe('Metric Schema', () => {
  const baseMetricConfig = {
    type: 'metric',
    dataset: {
      type: 'dataView',
      id: 'test-data-view',
    },
  } satisfies Partial<MetricState>;

  const defaultValues = {
    sampling: 1,
    ignore_global_filters: false,
  } satisfies Partial<MetricState>;

  type MetricInput = Omit<MetricState, keyof typeof defaultValues>;

  describe('primary metric configuration', () => {
    it('validates count metric operation', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          {
            type: 'primary',
            operation: 'count',
            field: 'test_field',
            fit: false,
            sub_label: 'Count of records',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            labels: {
              alignment: 'left',
            },
            value: {
              alignment: 'right',
            },
          },
        ],
      } satisfies MetricInput;

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates metric with icon configuration', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          {
            type: 'primary',
            operation: 'sum',
            field: 'price',
            fit: false,
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            icon: {
              name: 'visMetric',
              alignment: 'left',
            },
            labels: { alignment: 'left' },
            value: { alignment: 'left' },
          },
        ],
      } satisfies MetricInput;

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
      });
    });

    it('validates metric with color configuration', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          {
            type: 'primary',
            operation: 'average',
            field: 'temperature',
            fit: false,
            labels: { alignment: 'left' },
            value: { alignment: 'left' },
            color: {
              type: 'dynamic',
              range: 'absolute',
              steps: [
                { lt: 0, color: 'blue' },
                { gte: 0, lte: 100, color: 'red' },
              ],
            },
          },
        ],
      } satisfies MetricInput;

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates metric with background chart', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          {
            type: 'primary',
            operation: 'max',
            field: 'cpu_usage',
            fit: false,
            labels: { alignment: 'left' },
            value: { alignment: 'left' },
            background_chart: {
              type: 'bar',
              orientation: 'horizontal',
              max_value: {
                operation: 'static_value',
                value: 80,
              },
            },
          },
        ],
      } satisfies MetricInput;

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    describe('coloring configuration', () => {
      it('should throw for invalid color by value configuration', () => {
        const input = {
          ...baseMetricConfig,
          metrics: [
            {
              type: 'primary',
              operation: 'average',
              field: 'temperature',
              color: {
                type: 'dynamic',
                range: 'percentage',
                steps: [
                  { lt: 0, color: 'blue' },
                  { gte: 0, lte: 100, color: 'red' },
                ],
              },
              fit: false,
              labels: { alignment: 'left' },
              value: { alignment: 'left' },
            },
          ],
        } satisfies MetricInput;

        expect(() => metricStateSchema.validate(input)).toThrow(
          'When using percentage-based dynamic coloring, a breakdown dimension or max must be defined.'
        );
      });

      it('accepts percentage-based dynamic coloring with breakdown_by', () => {
        const input: MetricInput = {
          ...baseMetricConfig,
          metrics: [
            {
              type: 'primary',
              operation: 'average',
              field: 'temperature',
              color: {
                type: 'dynamic',
                range: 'percentage',
                steps: [
                  { lt: 0, color: 'blue' },
                  { gte: 0, lte: 100, color: 'red' },
                ],
              },
              fit: false,
              labels: { alignment: 'left' },
              value: { alignment: 'left' },
            },
          ],
          breakdown_by: {
            operation: 'terms',
            fields: ['category'],
            columns: 3,
            size: 5,
          },
        };

        expect(() => metricStateSchema.validate(input)).not.toThrow();
      });

      it('accepts percentage-based dynamic coloring with bar background_chart', () => {
        const input: MetricInput = {
          ...baseMetricConfig,
          metrics: [
            {
              type: 'primary',
              operation: 'average',
              field: 'temperature',
              color: {
                type: 'dynamic',
                range: 'percentage',
                steps: [
                  { lt: 0, color: 'blue' },
                  { gte: 0, lte: 100, color: 'red' },
                ],
              },
              fit: false,
              labels: { alignment: 'left' },
              value: { alignment: 'left' },
              background_chart: {
                type: 'bar',
                max_value: { operation: 'static_value', value: 100 },
              },
            },
          ],
        };

        expect(() => metricStateSchema.validate(input)).not.toThrow();
      });
    });
  });

  describe('secondary metric configuration', () => {
    it('validates with secondary metric', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          {
            type: 'primary',
            operation: 'sum',
            field: 'revenue',
            fit: false,
            labels: { alignment: 'left' },
            value: { alignment: 'left' },
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
          {
            type: 'secondary',
            operation: 'sum',
            field: 'cost',
            prefix: '$',
            placement: 'before',
            compare: {
              to: 'primary',
            },
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
      } satisfies MetricInput;

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates with colored secondary metric', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          {
            type: 'primary',
            operation: 'sum',
            field: 'revenue',
            fit: false,
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            labels: { alignment: 'left' },
            value: { alignment: 'left' },
          },
          {
            type: 'secondary',
            operation: 'sum',
            field: 'profit',
            prefix: '',
            placement: 'before',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            color: {
              type: 'static',
              color: 'green',
            },
          },
        ],
      } satisfies MetricInput;

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });

  describe('breakdown configuration', () => {
    it('validates terms breakdown', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          {
            type: 'primary',
            operation: 'sum',
            field: 'sales',
            fit: false,
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            labels: { alignment: 'left' },
            value: { alignment: 'left' },
          },
        ],
        breakdown_by: {
          operation: 'terms',
          fields: ['category'],
          columns: 3,
          collapse_by: 'sum',
          size: 5,
        },
      } satisfies MetricInput;

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
        metrics: [
          {
            type: 'primary',
            operation: 'sum',
            field: 'sales',
            fit: false,
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            labels: { alignment: 'left' },
            value: { alignment: 'left' },
          },
        ],
        breakdown_by: {
          operation: 'date_histogram',
          field: 'timestamp',
          suggested_interval: 'auto',
          include_empty_rows: true,
          use_original_time_range: true,
          columns: 4,
          collapse_by: 'avg',
        },
      } satisfies MetricInput;

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });

  describe('validation errors', () => {
    it('throws on missing metric operation', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          // @ts-expect-error - missing operation
          {
            type: 'primary',
            field: 'test_field',
          },
        ],
      } satisfies MetricInput;

      expect(() => metricStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid alignment value', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          {
            type: 'primary',
            operation: 'count',
            field: 'test_field',
            labels: {
              // @ts-expect-error - invalid alignment value
              alignment: 'invalid',
            },
          },
        ],
      } satisfies MetricInput;

      expect(() => metricStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid breakdown collapse_by value', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          {
            type: 'primary',
            operation: 'sum',
            field: 'sales',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            labels: { alignment: 'left' },
            value: { alignment: 'left' },
            fit: false,
          },
        ],
        breakdown_by: {
          operation: 'terms',
          fields: ['category'],
          // @ts-expect-error
          collapse_by: 'invalid',
        },
      } satisfies MetricInput;

      expect(() => metricStateSchema.validate(input)).toThrow();
    });

    it('throws if metric type is missing', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          // @ts-expect-error - missing type
          {
            operation: 'sum',
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            fit: false,
            labels: { alignment: 'left' },
            value: { alignment: 'left' },
          },
        ],
      } satisfies MetricInput;

      expect(() => metricStateSchema.validate(input)).toThrow();
    });

    it('throws for two primary metrics', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          {
            type: 'primary',
            operation: 'sum',
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            fit: false,
            labels: { alignment: 'left' },
            value: { alignment: 'left' },
          },
          {
            type: 'primary',
            operation: 'sum',
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            fit: false,
            labels: { alignment: 'left' },
            value: { alignment: 'left' },
          },
        ],
      } satisfies MetricInput;

      expect(() => metricStateSchema.validate(input)).toThrow();
    });

    it('throws for two secondary metrics', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          {
            type: 'secondary',
            operation: 'sum',
            field: 'test_field',
          },
          {
            type: 'secondary',
            operation: 'sum',
            field: 'test_field',
          },
        ],
      };

      expect(() => metricStateSchema.validate(input)).toThrow();
    });

    it('throws if the only metric is secondary', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          {
            type: 'secondary',
            operation: 'sum',
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            placement: 'before',
          },
        ],
      } satisfies MetricInput;

      expect(() => metricStateSchema.validate(input)).toThrow();
    });
  });

  describe('complex configurations', () => {
    it('validates full metric configuration', () => {
      const input = {
        ...baseMetricConfig,
        title: 'Sales Overview',
        description: 'Sales metrics breakdown by category',
        metrics: [
          {
            type: 'primary',
            operation: 'sum',
            field: 'sales',
            sub_label: 'Total Sales',
            fit: false,
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            labels: {
              alignment: 'left',
            },
            value: {
              alignment: 'right',
            },
            icon: {
              name: 'visMetric',
              alignment: 'right',
            },
            color: {
              type: 'dynamic',
              range: 'absolute',
              steps: [
                { lt: 0, color: 'red' },
                { gte: 0, lte: 1000, color: 'green' },
              ],
            },
            background_chart: {
              type: 'trend',
            },
          },
          {
            type: 'secondary',
            operation: 'sum',
            field: 'profit',
            prefix: '$',
            placement: 'before',
            compare: {
              to: 'primary',
            },
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        breakdown_by: {
          operation: 'terms',
          fields: ['category'],
          columns: 4,
          collapse_by: 'sum',
          size: 5,
        },
      } satisfies MetricInput;

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
        metrics: [
          {
            type: 'primary',
            operation: 'value',
            column: 'unique_count',
            fit: false,
            labels: { alignment: 'left' },
            value: { alignment: 'left' },
          },
        ],
      } satisfies MetricInput;

      const validated = metricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });
});
