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
    type: 'legacy_metric',
    dataset: {
      type: 'dataView',
      id: 'test-data-view',
    },
  };

  const defaultValues = {
    sampling: 1,
    ignore_global_filters: false,
  };

  describe('metric configuration', () => {
    it('validates base count metric operation', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
      };

      const validated = legacyMetricStateSchema.validate(input);
      expect(validated.metric.size).toBeUndefined();
      expect(validated.metric.alignments).toBeUndefined();
      expect(validated.metric.apply_color_to).toBeUndefined();
      expect(validated.metric.color).toBeUndefined();
    });

    it('validates count metric operation', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          size: 's',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          alignments: {
            labels: 'bottom',
            value: 'right',
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
          operation: 'average',
          field: 'temperature',
          alignments: { labels: 'top', value: 'left' },
          size: 'l',
          apply_color_to: 'value',
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
          operation: 'count',
          field: 'test_field',
          alignments: {
            labels: 'invalid',
          },
        },
      };

      expect(() => legacyMetricStateSchema.validate(input)).toThrow();
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

      expect(() => legacyMetricStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid apply_color_to value', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'sum',
          field: 'sales',
          apply_color_to: 'invalid',
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

      expect(() => legacyMetricStateSchema.validate(input)).toThrow();
    });

    it('throws when color by value is not absolute', () => {
      const input = {
        ...baseLegacyMetricConfig,
        metric: {
          operation: 'sum',
          field: 'sales',
          apply_color_to: 'invalid',
          color: {
            type: 'dynamic',
            range: 'percentage',
            min: 0,
            max: 100,
            steps: [
              { type: 'from', from: 0, color: '#blue' },
              { type: 'to', to: 100, color: '#red' },
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
          operation: 'sum',
          field: 'sales',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          size: 'xl',
          alignments: {
            labels: 'bottom',
            value: 'right',
          },
          apply_color_to: 'background',
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

      const validated = legacyMetricStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
      });
    });

    it('validates esql configuration', () => {
      const input = {
        type: 'legacy_metric',
        dataset: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        metric: {
          operation: 'value',
          column: 'unique_count',
          size: 'xxl',
          alignments: {
            labels: 'top',
            value: 'center',
          },
        },
      };

      const validated = legacyMetricStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });
});
