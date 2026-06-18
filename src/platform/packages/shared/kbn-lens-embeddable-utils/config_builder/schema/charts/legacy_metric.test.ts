/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectPrettyError } from '@kbn/zod-helpers/v4';
import { AS_CODE_DATA_VIEW_REFERENCE_TYPE } from '@kbn/as-code-data-views-schema';
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import type { LegacyMetricConfig, LegacyMetricConfigESQL } from './legacy_metric';
import { legacyMetricConfigSchema } from './legacy_metric';

describe('Legacy Metric Schema', () => {
  const baseLegacyMetricConfig = {
    type: 'legacy_metric',
    data_source: {
      type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
      ref_id: 'test-data-view',
    },
  } satisfies Partial<LegacyMetricConfig>;

  const defaultValues = {
    sampling: 1,
    ignore_global_filters: false,
  } satisfies Partial<LegacyMetricConfig>;

  type LegacyMetricInput = Omit<LegacyMetricConfig, keyof typeof defaultValues>;

  describe('metric configuration', () => {
    it('validates base count metric operation', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
      } satisfies LegacyMetricInput;

      const validated = legacyMetricConfigSchema.parse(input);
      expect(validated.metric.size).toBe('m');
      expect(validated.metric.labels).toBeUndefined();
      expect(validated.metric.values).toBeUndefined();
      expect(validated.metric.apply_color_to).toBeUndefined();
      expect(validated.metric.color).toEqual({ type: 'auto' });
    });

    it('validates count metric operation', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          size: 's',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          labels: {
            alignment: 'bottom',
          },
          values: {
            alignment: 'right',
          },
        },
      } satisfies LegacyMetricInput;

      const validated = legacyMetricConfigSchema.parse(input);
      expect(validated).toMatchObject({ ...defaultValues, ...input });
    });

    it('validates metric with color configuration', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'average',
          field: 'temperature',
          labels: { alignment: 'top' },
          values: { alignment: 'left' },
          size: 'l',
          apply_color_to: 'value',
          color: {
            type: 'dynamic',
            range: 'absolute',
            steps: [
              { lt: 0, color: 'blue' },
              { gte: 0, lte: 100, color: 'red' },
            ],
          },
        },
      } satisfies LegacyMetricInput;

      const validated = legacyMetricConfigSchema.parse(input);
      expect(validated).toMatchObject({ ...defaultValues, ...input });
    });
  });

  describe('validation errors', () => {
    it('throws on missing metric operation', () => {
      const input = {
        ...baseLegacyMetricConfig,
        // @ts-expect-error
        metric: {
          field: 'test_field',
        },
      } satisfies LegacyMetricInput;

      const result = legacyMetricConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input
          → at metric"
      `);
    });

    it('throws on invalid alignment value', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          labels: {
            // @ts-expect-error
            alignment: 'invalid',
          },
        },
      } satisfies LegacyMetricInput;

      const result = legacyMetricConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input
          → at metric.labels.alignment"
      `);
    });

    it('throws on invalid size value', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          size: 'invalid',
        },
      };

      const result = legacyMetricConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input
          → at metric.size"
      `);
    });

    it('throws on invalid apply_color_to value', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'sum',
          field: 'sales',
          // @ts-expect-error
          apply_color_to: 'invalid',
          color: {
            type: 'dynamic',
            range: 'absolute',
            steps: [
              { lt: 0, color: 'blue' },
              { gte: 0, lte: 100, color: 'red' },
            ],
          },
        },
      } satisfies LegacyMetricInput;

      const result = legacyMetricConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input
          → at metric.apply_color_to"
      `);
    });

    it('throws when color by value is not absolute', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'sum',
          field: 'sales',
          apply_color_to: 'background',
          color: {
            type: 'dynamic',
            // @ts-expect-error
            range: 'percentage',
            steps: [
              { lt: 0, color: 'blue' },
              { gte: 0, lte: 100, color: 'red' },
            ],
          },
        },
      } satisfies LegacyMetricInput;

      const result = legacyMetricConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input
          → at metric.color"
      `);
    });
  });

  describe('complex configurations', () => {
    it('validates full metric configuration', () => {
      const input = {
        ...baseLegacyMetricConfig,
        title: 'Sales Overview',
        description: 'Sales metrics',
        metric: {
          operation: 'sum',
          field: 'sales',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          size: 'xl',
          labels: {
            alignment: 'bottom',
          },
          values: { alignment: 'right' },
          apply_color_to: 'background',
          color: {
            type: 'dynamic',
            range: 'absolute',
            steps: [
              { lt: 0, color: 'blue' },
              { gte: 0, lte: 100, color: 'red' },
            ],
          },
        },
      } satisfies LegacyMetricInput;

      const validated = legacyMetricConfigSchema.parse(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
      });
    });

    it('rejects esql configuration', () => {
      const input = {
        type: 'legacy_metric',
        data_source: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        metric: {
          column: 'unique_count',
          size: 'xxl',
          labels: { alignment: 'top' },
          values: { alignment: 'center' },
        },
      } satisfies Omit<LegacyMetricConfigESQL, keyof typeof defaultValues>;

      const result = legacyMetricConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input
          → at metric
        ✖ Invalid discriminator value. Expected 'data_view_reference' | 'data_view_spec'
          → at data_source.type"
      `);
    });
  });
});
