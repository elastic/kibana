/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import { mosaicStateSchema } from './mosaic';

describe('Mosaic Schema', () => {
  const baseMosaicConfig = {
    type: 'mosaic' as const,
    dataset: {
      type: 'dataView' as const,
      id: 'test-data-view',
    },
  };

  const defaultValues = {
    sampling: 1,
    ignore_global_filters: false,
  };

  it('validates minimal configuration', () => {
    const input = {
      ...baseMosaicConfig,
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

    const validated = mosaicStateSchema.validate(input);
    expect(validated).toEqual({
      ...defaultValues,
      ...input,
      group_by: [{ ...input.group_by[0], size: 5 }],
    });
  });

  it('validates full configuration', () => {
    const input = {
      ...baseMosaicConfig,
      title: 'Sales Mosaic',
      description: 'Sales data visualization',
      metrics: [
        {
          operation: 'sum' as const,
          field: 'sales',
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
          collapse_by: 'avg' as const,
        },
      ],
      legend: {
        nested: true,
        truncate_after_lines: 5,
        visible: 'hide' as const,
        size: 'small' as const,
      },
      value_display: {
        mode: 'hidden' as const,
      },
    };

    const validated = mosaicStateSchema.validate(input);
    expect(validated).toEqual({
      ...defaultValues,
      ...input,
      group_by: [{ ...input.group_by[0], size: 5 }],
    });
  });

  it('validates default values are applied', () => {
    const input = {
      ...baseMosaicConfig,
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

    const validated = mosaicStateSchema.validate(input);
    expect(validated.legend).toEqual({});
  });

  it('throws on empty group_by array', () => {
    const input = {
      ...baseMosaicConfig,
      metrics: [
        {
          operation: 'count' as const,
          field: 'test_field',
        },
      ],
      group_by: [],
    };

    expect(() => mosaicStateSchema.validate(input)).toThrow();
  });
});
