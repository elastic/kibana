/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import { waffleStateSchema } from './waffle';

describe('Waffle Schema', () => {
  const baseWaffleConfig = {
    type: 'waffle' as const,
    dataset: {
      type: 'dataView' as const,
      name: 'test-data-view',
    },
  };

  const defaultValues = {
    sampling: 1,
    ignore_global_filters: false,
  };

  it('validates minimal configuration', () => {
    const input = {
      ...baseWaffleConfig,
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

    const validated = waffleStateSchema.validate(input);
    expect(validated).toEqual({
      ...defaultValues,
      ...input,
      group_by: [{ ...input.group_by[0], size: 5 }],
    });
  });

  it('validates full configuration with waffle-specific legend values', () => {
    const input = {
      ...baseWaffleConfig,
      title: 'Sales Waffle',
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
      legend: {
        values: ['absolute' as const],
        truncate_after_lines: 2,
        visible: 'show' as const,
        size: 'medium' as const,
      },
      value_display: {
        mode: 'percentage' as const,
        percent_decimals: 1,
      },
    };

    const validated = waffleStateSchema.validate(input);
    expect(validated).toEqual({
      ...defaultValues,
      ...input,
      group_by: [{ ...input.group_by[0], size: 5 }],
    });
  });

  it('validates default values are applied', () => {
    const input = {
      ...baseWaffleConfig,
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

    const validated = waffleStateSchema.validate(input);
    expect(validated.legend).toEqual({});
  });

  it('validates ESQL configuration', () => {
    const input = {
      type: 'waffle' as const,
      dataset: {
        type: 'esql' as const,
        query: 'FROM my-index | STATS count() BY category',
      },
      metrics: {
        operation: 'value',
        column: 'count' as const,
      },
    };

    const validated = waffleStateSchema.validate(input);
    expect(validated).toEqual({ ...defaultValues, ...input });
  });

  it('throws on empty metrics array', () => {
    const input = {
      ...baseWaffleConfig,
      metrics: [],
      group_by: [
        {
          operation: 'terms' as const,
          fields: ['category'],
        },
      ],
    };

    expect(() => waffleStateSchema.validate(input)).toThrow();
  });
});
