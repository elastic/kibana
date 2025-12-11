/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import { pieStateSchema } from './pie';

describe('Pie/Donut Schema', () => {
  const defaultValues = {
    sampling: 1,
    ignore_global_filters: false,
  };

  describe.each(['pie', 'donut'] as const)('%s chart type', (chartType) => {
    const basePieConfig = {
      type: chartType,
      dataset: {
        type: 'dataView',
        id: 'test-data-view',
      },
    };

    it('validates minimal configuration', () => {
      const input = {
        ...basePieConfig,
        metrics: [
          {
            operation: 'count',
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms',
            fields: ['category'],
          },
        ],
      };

      const validated = pieStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });

    it('validates configuration with donut_hole', () => {
      const input = {
        ...basePieConfig,
        metrics: [
          {
            operation: 'sum',
            field: 'sales',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms',
            fields: ['category'],
          },
        ],
        donut_hole: 'medium',
      };

      const validated = pieStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });

    it('validates full configuration with specific options', () => {
      const input = {
        ...basePieConfig,
        title: 'Sales Chart',
        metrics: [
          {
            operation: 'sum',
            field: 'sales',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms',
            fields: ['category'],
          },
        ],
        legend: {
          nested: false,
          truncate_after_lines: 2,
          visible: 'show',
          size: 'xlarge',
        },
        label_position: 'inside',
        donut_hole: 'small',
        value_display: {
          mode: 'percentage',
          percent_decimals: 0,
        },
      };

      const validated = pieStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        group_by: [{ ...input.group_by[0], size: 5 }],
      });
    });

    it('validates default values are applied', () => {
      const input = {
        ...basePieConfig,
        metrics: [
          {
            operation: 'count',
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
        group_by: [
          {
            operation: 'terms',
            fields: ['category'],
          },
        ],
        legend: {},
        value_display: {
          mode: 'percentage',
        },
      };

      const validated = pieStateSchema.validate(input);
      expect(validated.legend).toEqual({});
      expect(validated.value_display).toEqual({
        mode: 'percentage',
      });
    });

    it('throws on invalid donut hole size', () => {
      const input = {
        ...basePieConfig,
        metrics: [
          {
            operation: 'count',
            field: 'test_field',
          },
        ],
        group_by: [
          {
            operation: 'terms',
            fields: ['category'],
          },
        ],
        donut_hole: 'invalid',
      };

      expect(() => pieStateSchema.validate(input)).toThrow();
    });
  });
});
