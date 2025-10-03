/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import { legacyMetricStateSchema } from './legacy_metric';

describe('Legacy Metric Schema', () => {
  const baseLegacyMetricConfig = {
    type: 'legacy_metric' as const,
    dataset: {
      type: 'dataView' as const,
      id: 'test-data-view',
    },
  };

  const defaultValues = {
    sampling: 1,
    ignore_global_filters: false,
  };

  describe('metric configuration', () => {
    it('validates default values are applied', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'count' as const,
          field: 'test_field',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
      };

      const validated = legacyMetricStateSchema.validate(input);
      expect(validated.metric.size).toBe('m');
      expect(validated.metric.alignment).toEqual({
        label: 'top',
        value: 'left',
      });
      expect(validated.metric.color).toBeUndefined();
    });

    it('validates count metric operation', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'count' as const,
          field: 'test_field',
          size: 's' as const,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          alignment: {
            label: 'bottom' as const,
            value: 'right' as const,
          },
        },
      };

      const validated = legacyMetricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates metric with color configuration', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'average' as const,
          field: 'temperature',
          alignment: { label: 'top', value: 'left' },
          size: 'l' as const,
          color: {
            apply_color_to: 'text' as const,
            type: 'dynamic' as const,
            min: 0,
            max: 100,
            range: 'absolute' as const,
            steps: [
              { type: 'from' as const, from: 0, color: '#blue' },
              { type: 'to' as const, to: 100, color: '#red' },
            ],
          },
        },
      };

      const validated = legacyMetricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });

  describe('validation errors', () => {
    it('throws on missing metric operation', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          field: 'test_field',
        },
      };

      expect(() => legacyMetricStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid alignment value', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'count' as const,
          field: 'test_field',
          alignment: {
            label: 'invalid' as const,
          },
        },
      };

      expect(() => legacyMetricStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid size value', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'count' as const,
          field: 'test_field',
          size: 'invalid' as const,
        },
      };

      expect(() => legacyMetricStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid apply_color_to value', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'sum' as const,
          field: 'sales',
          color: {
            apply_color_to: 'invalid' as const,
            type: 'dynamic' as const,
            min: 0,
            max: 100,
            range: 'absolute' as const,
            steps: [
              { type: 'from' as const, from: 0, color: '#blue' },
              { type: 'to' as const, to: 100, color: '#red' },
            ],
          },
        },
      };

      expect(() => legacyMetricStateSchema.validate(input)).toThrow();
    });
  });

  describe('complex configurations', () => {
    it('validates full metric configuration', () => {
      const input = {
        ...baseLegacyMetricConfig,
        title: 'Sales Overview',
        description: 'Sales metrics',
        metric: {
          operation: 'sum' as const,
          field: 'sales',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          size: 'xl' as const,
          alignment: {
            label: 'bottom' as const,
            value: 'right' as const,
          },
          color: {
            apply_color_to: 'background' as const,
            type: 'dynamic' as const,
            min: 0,
            max: 1000,
            range: 'absolute' as const,
            steps: [
              { type: 'from' as const, from: 0, color: '#red' },
              { type: 'to' as const, to: 1000, color: '#green' },
            ],
          },
        },
      };

      const validated = legacyMetricStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
      });
    });

    it('validates esql configuration', () => {
      const input = {
        type: 'legacy_metric' as const,
        dataset: {
          type: 'esql' as const,
          query: 'FROM my-index | LIMIT 100',
        },
        metric: {
          operation: 'value',
          column: 'unique_count' as const,
          size: 'xxl' as const,
          alignment: {
            label: 'top' as const,
            value: 'center' as const,
          },
        },
      };

      const validated = legacyMetricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });
});
