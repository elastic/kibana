/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import { treemapStateSchema } from './treemap';

describe('Treemap Schema', () => {
  const baseTreemapConfig = {
    type: 'treemap',
    dataset: {
      type: 'dataView',
      id: 'test-data-view',
    },
  };

  const defaultValues = {
    sampling: 1,
    ignore_global_filters: false,
  };

  it('validates minimal configuration', () => {
    const input = {
      ...baseTreemapConfig,
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

    const validated = treemapStateSchema.validate(input);
    expect(validated).toEqual({
      ...defaultValues,
      ...input,
      group_by: [{ ...input.group_by[0], size: 5 }],
    });
  });

  it('validates full configuration with treemap-specific label position', () => {
    const input = {
      ...baseTreemapConfig,
      title: 'Sales Treemap',
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
        nested: true,
        truncate_after_lines: 3,
        visible: 'auto',
        size: 'large',
      },
      label_position: 'visible',
      value_display: {
        mode: 'absolute',
      },
    };

    const validated = treemapStateSchema.validate(input);
    expect(validated).toEqual({
      ...defaultValues,
      ...input,
      group_by: [{ ...input.group_by[0], size: 5 }],
    });
  });

  it('validates default values are applied', () => {
    const input = {
      ...baseTreemapConfig,
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
    };

    const validated = treemapStateSchema.validate(input);
    expect(validated.legend).toEqual({});
  });

  it('throws on invalid label position', () => {
    const input = {
      ...baseTreemapConfig,
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
      label_position: 'invalid',
    };

    expect(() => treemapStateSchema.validate(input)).toThrow();
  });
});
