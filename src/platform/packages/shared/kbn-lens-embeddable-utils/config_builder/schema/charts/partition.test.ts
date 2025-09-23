/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import { partitionStateSchema } from './partition';

describe('Partition Schema', () => {
  const basePartitionConfig = {
    type: 'pie' as const,
    dataset: {
      type: 'dataView' as const,
      name: 'test-data-view',
    },
  };

  const defaultValues = {
    sampling: 1,
    ignore_global_filters: false,
  };

  describe('metrics configuration', () => {
    it('validates single metric', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'count' as const,
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });

    it('validates metric with static color', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'sum' as const,
            field: 'price',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            color: {
              type: 'static' as const,
              color: '#blue',
            },
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });
  });

  describe('group_by configuration', () => {
    it('validates with group_by', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'sum' as const,
            field: 'revenue',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });

    it('validates with colored group_by using color by value', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'sum' as const,
            field: 'revenue',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
            color: {
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
        ],
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });

    it('validates with collapse_by configuration', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'sum' as const,
            field: 'revenue',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
            collapse_by: 'sum' as const,
          },
        ],
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });
  });

  describe('legend configuration', () => {
    it('validates nested legend configuration', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'count' as const,
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
        legend: {
          nested: true,
        },
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });

    it('validates legend with values for waffle chart', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'count' as const,
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
        legend: {
          nested: false,
          values: ['absolute' as const],
        },
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });

    it('validates default nested value', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'count' as const,
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
        legend: {},
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });
  });

  describe('value_display configuration', () => {
    it('validates value display mode', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'sum' as const,
            field: 'sales',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
        value_display: {
          mode: 'percentage' as const,
        },
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });

    it('validates value display with percent decimals', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'sum' as const,
            field: 'sales',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
        value_display: {
          mode: 'percentage' as const,
          percent_decimals: 3,
        },
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });

    it('validates default percent decimals value', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'sum' as const,
            field: 'sales',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
        value_display: {
          mode: 'percentage' as const,
        },
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });
  });

  describe('label_position configuration', () => {
    it('validates label position for pie/donut charts', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'count' as const,
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
        label_position: 'inside' as const,
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });

    it('validates hidden label position', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'count' as const,
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
        label_position: 'hidden' as const,
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });

    it('validates outside label position', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'count' as const,
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
        label_position: 'outside' as const,
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });
  });

  describe('donut_hole configuration', () => {
    it('validates donut hole size for pie/donut charts', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'count' as const,
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
        donut_hole: 'medium' as const,
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });

    it('validates all donut hole sizes', () => {
      const sizes = ['none', 'small', 'medium', 'large'] as const;
      
      sizes.forEach((size) => {
        const input = {
          ...basePartitionConfig,
          metrics: [
            {
              operation: 'count' as const,
              field: 'test_field',
              empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            },
          ],
          group_by: [
            {
              operation: 'terms' as const,
              fields: ['category'],
            },
          ],
          donut_hole: size,
        };

        const validated = partitionStateSchema.validate(input);
        expect(validated).toEqual({
          ...defaultValues,
          ...input,
          group_by: [{ ...input.group_by[0], size: 5 }],
        });
      });
    });
  });

  describe('validation errors', () => {
    it('throws on empty metrics array', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
      };

      expect(() => partitionStateSchema.validate(input)).toThrow();
    });

    it('throws on empty group_by array', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'count' as const,
            field: 'test_field',
          },
        ],
        group_by: [],
      };

      expect(() => partitionStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid value display mode', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'count' as const,
            field: 'test_field',
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
        value_display: {
          mode: 'invalid' as const,
        },
      };

      expect(() => partitionStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid percent decimals range', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'count' as const,
            field: 'test_field',
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
        value_display: {
          mode: 'percentage' as const,
          percent_decimals: 15,
        },
      };

      expect(() => partitionStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid label position', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'count' as const,
            field: 'test_field',
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
        label_position: 'invalid' as const,
      };

      expect(() => partitionStateSchema.validate(input)).toThrow();
    });

    it('throws on invalid donut hole size', () => {
      const input = {
        ...basePartitionConfig,
        metrics: [
          {
            operation: 'count' as const,
            field: 'test_field',
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
          },
        ],
        donut_hole: 'invalid' as const,
      };

      expect(() => partitionStateSchema.validate(input)).toThrow();
    });
  });

  describe('complex configurations', () => {
    it('validates full partition configuration', () => {
      const input = {
        ...basePartitionConfig,
        title: 'Sales Partition',
        description: 'Sales metrics visualization by category',
        metrics: [
          {
            operation: 'sum' as const,
            field: 'sales',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            color: {
              type: 'static' as const,
              color: '#green',
            },
          },
        ],
        group_by: [
          {
            operation: 'terms' as const,
            fields: ['category'],
            collapse_by: 'sum' as const,
            color: {
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
        ],
        legend: {
          nested: true,
          values: ['absolute' as const],
        },
        value_display: {
          mode: 'percentage' as const,
          percent_decimals: 1,
        },
        label_position: 'inside' as const,
        donut_hole: 'medium' as const,
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });

    it('validates esql configuration', () => {
      const input = {
        type: 'pie' as const,
        dataset: {
          type: 'esql' as const,
          query: 'FROM my-index | LIMIT 100',
        },
        metrics: {
          operation: 'value',
          column: 'count' as const,
        },
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates esql configuration with group_by', () => {
      const input = {
        type: 'pie' as const,
        dataset: {
          type: 'esql' as const,
          query: 'FROM my-index | STATS count() BY category | LIMIT 100',
        },
        metrics: {
          operation: 'value',
          column: 'count' as const,
        },
        group_by: {
          operation: 'value',
          column: 'category' as const,
          collapse_by: 'avg' as const,
        },
        value_display: {
          mode: 'absolute' as const,
          percent_decimals: 0,
        },
        label_position: 'outside' as const,
      };

      const validated = partitionStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });
});