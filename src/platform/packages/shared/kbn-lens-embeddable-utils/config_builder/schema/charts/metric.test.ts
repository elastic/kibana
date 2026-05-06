/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_REFERENCE_TYPE } from '@kbn/as-code-data-views-schema';
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import type { MetricConfig } from './metric';
import { metricConfigSchema } from './metric';

describe('Metric Schema', () => {
  const baseMetricConfig = {
    type: 'metric',
    data_source: {
      type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
      ref_id: 'test-data-view',
    },
  } satisfies Partial<MetricConfig>;

  const defaultValues = {
    sampling: 1,
    ignore_global_filters: false,
  } satisfies Partial<MetricConfig>;

  type MetricInput = Omit<MetricConfig, keyof typeof defaultValues>;

  describe('primary metric configuration', () => {
    it('validates count metric operation', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          {
            type: 'primary',
            operation: 'count',
            field: 'test_field',
            subtitle: 'Count of records',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        styling: {
          primary: {
            labels: { alignment: 'left' },
            value: { sizing: 'auto', alignment: 'right' },
          },
        },
      } satisfies MetricInput;

      const validated = metricConfigSchema.validate(input);
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
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        styling: {
          icon: {
            name: 'star_empty',
            alignment: 'left',
          },
          primary: {
            labels: { alignment: 'left' },
            value: { sizing: 'auto', alignment: 'left' },
          },
        },
      } satisfies MetricInput;

      const validated = metricConfigSchema.validate(input);
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
        styling: {
          primary: {
            labels: { alignment: 'left' },
            value: { sizing: 'auto', alignment: 'left' },
          },
        },
      } satisfies MetricInput;

      const validated = metricConfigSchema.validate(input);
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
        styling: {
          primary: {
            labels: { alignment: 'left' },
            value: { sizing: 'auto', alignment: 'left' },
          },
        },
      } satisfies MetricInput;

      const validated = metricConfigSchema.validate(input);
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
            },
          ],
        } satisfies MetricInput;

        expect(() => metricConfigSchema.validate(input)).toThrow(
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
            },
          ],
          breakdown_by: {
            operation: 'terms',
            fields: ['category'],
            columns: 3,
            limit: 5,
          },
        };

        expect(() => metricConfigSchema.validate(input)).not.toThrow();
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
              background_chart: {
                type: 'bar',
                max_value: { operation: 'static_value', value: 100 },
              },
            },
          ],
        };

        expect(() => metricConfigSchema.validate(input)).not.toThrow();
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
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
          {
            type: 'secondary',
            operation: 'sum',
            field: 'cost',
            label: '$',
            compare: {
              to: 'primary',
            },
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        styling: {
          secondary: {
            label: { visible: true, placement: 'before' },
          },
        },
      } satisfies MetricInput;

      const validated = metricConfigSchema.validate(input);
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
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
          {
            type: 'secondary',
            operation: 'sum',
            field: 'profit',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            color: {
              type: 'static',
              color: 'green',
            },
          },
        ],
        styling: {
          secondary: {
            label: { visible: false, placement: 'before' },
          },
        },
      } satisfies MetricInput;

      const validated = metricConfigSchema.validate(input);
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
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        breakdown_by: {
          operation: 'terms',
          fields: ['category'],
          columns: 3,
          collapse_by: 'sum',
          limit: 5,
        },
      } satisfies MetricInput;

      const validated = metricConfigSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        breakdown_by: { ...input.breakdown_by, limit: 5 },
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
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
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

      const validated = metricConfigSchema.validate(input);
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

      expect(() => metricConfigSchema.validate(input)).toThrow();
    });

    it('throws on invalid styling alignment value', () => {
      const input = {
        ...baseMetricConfig,
        metrics: [
          {
            type: 'primary',
            operation: 'count',
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        styling: {
          primary: {
            labels: {
              // @ts-expect-error - invalid alignment value
              alignment: 'invalid',
            },
          },
        },
      } satisfies MetricInput;

      expect(() => metricConfigSchema.validate(input)).toThrow();
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
          },
        ],
        breakdown_by: {
          operation: 'terms',
          fields: ['category'],
          // @ts-expect-error
          collapse_by: 'invalid',
        },
      } satisfies MetricInput;

      expect(() => metricConfigSchema.validate(input)).toThrow();
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
          },
        ],
      } satisfies MetricInput;

      expect(() => metricConfigSchema.validate(input)).toThrow();
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
          },
          {
            type: 'primary',
            operation: 'sum',
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
      } satisfies MetricInput;

      expect(() => metricConfigSchema.validate(input)).toThrow();
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

      expect(() => metricConfigSchema.validate(input)).toThrow();
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
          },
        ],
      } satisfies MetricInput;

      expect(() => metricConfigSchema.validate(input)).toThrow();
    });

    it('throws if the icon name is invalid', () => {
      const input = {
        ...baseMetricConfig,

        styling: {
          icon: {
            // @ts-expect-error - camelCase icon name
            name: 'starEmpty',
            alignment: 'right',
          },
        },
        metrics: [
          {
            type: 'primary',
            operation: 'sum',
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
      } satisfies MetricInput;

      expect(() => metricConfigSchema.validate(input)).toThrow();
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
            subtitle: 'Total Sales',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
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
            label: '$',
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
          limit: 5,
        },
        styling: {
          icon: { name: 'star_empty', alignment: 'right' },
          primary: {
            labels: { alignment: 'left' },
            value: { sizing: 'auto', alignment: 'right' },
          },
          secondary: {
            label: { visible: true, placement: 'before' },
          },
        },
      } satisfies MetricInput;

      const validated = metricConfigSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        breakdown_by: { ...input.breakdown_by, limit: 5 },
      });
    });

    it('validates esql configuration', () => {
      const input = {
        type: 'metric',
        data_source: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        metrics: [
          {
            type: 'primary',
            column: 'unique_count',
          },
        ],
        styling: {
          primary: {
            labels: { alignment: 'left' },
            value: { sizing: 'auto', alignment: 'left' },
          },
        },
      } satisfies MetricInput;

      const validated = metricConfigSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });
});
