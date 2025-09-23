/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import { partitionStateSchema } from './pie';

describe('Pie Schema', () => {
  const basePieConfig = {
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

  it('validates minimal pie configuration', () => {
    const input = {
      ...basePieConfig,
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

  it('validates donut configuration', () => {
    const input = {
      type: 'donut' as const,
      dataset: {
        type: 'dataView' as const,
        name: 'test-data-view',
      },
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
      donut_hole: 'medium' as const,
    };

    const validated = partitionStateSchema.validate(input);
    expect(validated).toEqual({
      ...defaultValues,
      ...input,
      group_by: [{ ...input.group_by[0], size: 5 }],
    });
  });

  it('validates full configuration with pie-specific options', () => {
    const input = {
      ...basePieConfig,
      title: 'Sales Pie Chart',
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
        nested: false,
        truncate_after_lines: 2,
        visible: 'show' as const,
        size: 'xlarge' as const,
      },
      label_position: 'inside' as const,
      donut_hole: 'small' as const,
      value_display: {
        mode: 'percentage' as const,
        percent_decimals: 0,
      },
    };

    const validated = partitionStateSchema.validate(input);
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
      value_display: {
        mode: 'percentage' as const,
      },
    };

    const validated = partitionStateSchema.validate(input);
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
