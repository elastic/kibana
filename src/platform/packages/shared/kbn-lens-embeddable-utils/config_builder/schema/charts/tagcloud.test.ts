/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import { tagcloudStateSchema } from './tagcloud';

describe('Tagcloud Schema', () => {
  const baseTagcloudConfig = {
    type: 'tagcloud',
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
    it('validates count metric operation', () => {
      const input = {
        ...baseTagcloudConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          show_metric_label: false,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
      };

      const validated = tagcloudStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates metric with show metric label', () => {
      const input = {
        ...baseTagcloudConfig,
        metric: {
          operation: 'sum',
          field: 'price',
          show_metric_label: true,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
      };

      const validated = tagcloudStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
      });
    });
  });

  describe('tag_by configuration', () => {
    it('validates with tag_by', () => {
      const input = {
        ...baseTagcloudConfig,
        metric: {
          operation: 'sum',
          field: 'revenue',
          show_metric_label: false,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        tag_by: {
          operation: 'terms',
          fields: ['category'],
        },
      };

      const validated = tagcloudStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        tag_by: { ...input.tag_by, size: 5 },
      });
    });

    it('validates with colored tag_by', () => {
      const input = {
        ...baseTagcloudConfig,
        metric: {
          operation: 'sum',
          field: 'revenue',
          show_metric_label: false,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        tag_by: {
          operation: 'terms',
          fields: ['category'],
          color: {
            mode: 'categorical',
            palette: 'kibana_palette',
            mapping: [
              {
                values: ['value1', 'value2', 'value3'],
                color: { type: 'from_palette', palette: 'default', index: 0 },
              },
            ],
            unassignedColor: { type: 'colorCode', value: '#cccccc' },
          },
        },
      };

      const validated = tagcloudStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        tag_by: { ...input.tag_by, size: 5 },
      });
    });
  });

  describe('orientation configuration', () => {
    it('validates horizontal orientation', () => {
      const input = {
        ...baseTagcloudConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          show_metric_label: false,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        orientation: 'horizontal',
      };

      const validated = tagcloudStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates vertical orientation', () => {
      const input = {
        ...baseTagcloudConfig,
        metric: {
          operation: 'sum',
          field: 'sales',
          show_metric_label: false,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        orientation: 'vertical',
      };

      const validated = tagcloudStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates right angled orientation', () => {
      const input = {
        ...baseTagcloudConfig,
        metric: {
          operation: 'sum',
          field: 'sales',
          show_metric_label: false,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        orientation: 'right_angled',
      };

      const validated = tagcloudStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });

  describe('font size configuration', () => {
    it('validates font size configuration', () => {
      const input = {
        ...baseTagcloudConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          show_metric_label: false,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        font_size: {
          min: 10,
          max: 80,
        },
      };

      const validated = tagcloudStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates default font size values', () => {
      const input = {
        ...baseTagcloudConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          show_metric_label: false,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        font_size: {},
      };

      const validated = tagcloudStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        font_size: { min: 14, max: 72 },
      });
    });
  });

  describe('validation errors', () => {
    it('throws on missing metric operation', () => {
      const input = {
        ...baseTagcloudConfig,
        metric: {
          field: 'test_field',
        },
      };

      expect(() => tagcloudStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid orientation value', () => {
      const input = {
        ...baseTagcloudConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          show_metric_label: false,
        },
        orientation: 'invalid',
      };

      expect(() => tagcloudStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid font size minimum', () => {
      const input = {
        ...baseTagcloudConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          show_metric_label: false,
        },
        font_size: {
          min: 0,
          max: 72,
        },
      };

      expect(() => tagcloudStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid font size maximum', () => {
      const input = {
        ...baseTagcloudConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          show_metric_label: false,
        },
        font_size: {
          min: 14,
          max: 150,
        },
      };

      expect(() => tagcloudStateSchema.validate(input)).toThrow();
    });

    it('throw when missing DSL and esql operation in a configuration', () => {
      const input = {
        type: 'tagcloud',
        dataset: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        metric: {
          operation: 'value',
          column: 'count',
        },
        tag_by: {
          operation: 'terms',
          fields: ['category'],
          size: 5,
        },
      };
      expect(() => tagcloudStateSchema.validate(input)).toThrow();
    });

    it('throws when tag_by color is not a palette mapping', () => {
      const input = {
        ...baseTagcloudConfig,
        metric: {
          operation: 'sum',
          field: 'revenue',
          show_metric_label: false,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        tag_by: {
          operation: 'terms',
          fields: ['category'],
          color: {
            type: 'static',
            color: '#00ff00',
          },
        },
      };

      expect(() => tagcloudStateSchema.validate(input)).toThrow();
    });
  });

  describe('complex configurations', () => {
    it('validates full tagcloud configuration', () => {
      const input = {
        ...baseTagcloudConfig,
        title: 'Sales Tagcloud',
        description: 'Sales metrics visualization by category',
        orientation: 'horizontal',
        font_size: {
          min: 12,
          max: 60,
        },
        metric: {
          operation: 'sum',
          field: 'sales',
          show_metric_label: true,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        tag_by: {
          operation: 'terms',
          fields: ['category'],
          color: {
            mode: 'gradient',
            palette: 'kibana_palette',
            gradient: [
              { type: 'colorCode', value: '#ff0000' },
              { type: 'colorCode', value: '#00ff00' },
            ],
          },
        },
      };

      const validated = tagcloudStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        tag_by: { ...input.tag_by, size: 5 },
      });
    });

    it('validates esql configuration', () => {
      const input = {
        type: 'tagcloud',
        dataset: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        metric: {
          operation: 'value',
          column: 'count',
          show_metric_label: false,
        },
      };

      const validated = tagcloudStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates esql configuration with tag_by', () => {
      const input = {
        type: 'tagcloud',
        dataset: {
          type: 'esql',
          query: 'FROM my-index | STATS count() BY category | LIMIT 100',
        },
        metric: {
          operation: 'value',
          column: 'count',
          show_metric_label: false,
        },
        tag_by: {
          operation: 'value',
          column: 'category',
        },
        orientation: 'vertical',
        font_size: {
          min: 16,
          max: 48,
        },
      };

      const validated = tagcloudStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });
});
