/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MosaicState, MosaicStateNoESQL } from './mosaic';
import { mosaicStateSchema } from './mosaic';

describe('Mosaic Schema', () => {
  const baseMosaicConfig: Pick<
    MosaicStateNoESQL,
    'type' | 'dataset' | 'ignore_global_filters' | 'sampling'
  > = {
    type: 'mosaic',
    dataset: {
      type: 'dataView',
      id: 'test-data-view',
    },
    ignore_global_filters: false,
    sampling: 0,
  };

  describe('Non-ES|QL Schema', () => {
    it('validates minimal configuration with single outer grouping', () => {
      const input: MosaicState = {
        ...baseMosaicConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: true,
          },
        ],
        group_by: [
          {
            operation: 'terms',
            size: 5,
            fields: ['category'],
          },
        ],
      };

      const validated = mosaicStateSchema.validate(input);
      expect(validated.type).toBe('mosaic');
      expect(validated.metrics[0].operation).toBe('count');
      expect(validated.group_by).toHaveLength(1);
    });

    it('validates configuration with both outer and inner grouping', () => {
      const input: MosaicState = {
        ...baseMosaicConfig,
        metrics: [
          {
            operation: 'sum',
            empty_as_null: false,
            field: 'sales',
          },
        ],
        group_by: [
          {
            operation: 'terms',
            size: 5,
            fields: ['category'],
          },
        ],
        group_breakdown_by: [
          {
            operation: 'date_histogram',
            field: 'date_field',
            suggested_interval: 'auto',
            use_original_time_range: false,
            include_empty_rows: true,
          },
        ],
      };

      const validated = mosaicStateSchema.validate(input);
      expect(validated.metrics[0].operation).toBe('sum');
      expect(validated.group_by).toHaveLength(1);
      expect(validated.group_breakdown_by).toHaveLength(1);
    });

    it('validates configuration with collapsed dimensions', () => {
      const input: MosaicState = {
        ...baseMosaicConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: true,
          },
        ],
        group_by: [
          {
            operation: 'terms',
            size: 5,
            fields: ['region'],
            collapse_by: 'sum',
          },
          {
            operation: 'terms',
            size: 5,
            fields: ['category'],
          },
        ],
        group_breakdown_by: [
          {
            operation: 'date_histogram',
            field: 'date_field',
            collapse_by: 'avg',
            suggested_interval: 'auto',
            use_original_time_range: false,
            include_empty_rows: true,
          },
        ],
      };

      const validated = mosaicStateSchema.validate(input);
      expect(validated.group_by).toHaveLength(2);
      expect(validated.group_breakdown_by).toHaveLength(1);
    });

    it('validates full configuration with legend and value display', () => {
      const input: MosaicState = {
        ...baseMosaicConfig,
        title: 'Sales Mosaic',
        description: 'Sales data visualization',
        metrics: [
          {
            operation: 'sum',
            empty_as_null: false,
            field: 'sales',
          },
        ],
        group_by: [
          {
            operation: 'terms',
            size: 5,
            fields: ['category'],
          },
        ],
        group_breakdown_by: [
          {
            operation: 'terms',
            size: 5,
            fields: ['subcategory'],
          },
        ],
        legend: {
          nested: true,
          truncate_after_lines: 5,
          visible: 'show',
          size: 'small',
        },
        value_display: {
          mode: 'hidden',
        },
      };

      const validated = mosaicStateSchema.validate(input);
      expect(validated.title).toBe('Sales Mosaic');
      expect(validated.legend?.nested).toBe(true);
      expect(validated.value_display?.mode).toBe('hidden');
    });

    it('throws on empty group_by array', () => {
      const input: MosaicState = {
        ...baseMosaicConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: true,
          },
        ],
        group_by: [],
      };

      expect(() => mosaicStateSchema.validate(input)).toThrow();
    });

    it('throws on empty group_breakdown_by array', () => {
      const input: MosaicState = {
        ...baseMosaicConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: true,
          },
        ],
        group_by: [
          {
            operation: 'terms',
            size: 5,
            fields: ['category'],
          },
        ],
        group_breakdown_by: [],
      };

      expect(() => mosaicStateSchema.validate(input)).toThrow();
    });

    describe('Grouping Cardinality Validation', () => {
      it('allows single non-collapsed dimension in group_by', () => {
        const input: MosaicState = {
          ...baseMosaicConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              size: 5,
              fields: ['category'],
            },
          ],
        };

        expect(() => mosaicStateSchema.validate(input)).not.toThrow();
      });

      it('allows multiple collapsed dimensions in group_by', () => {
        const input: MosaicState = {
          ...baseMosaicConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              size: 5,
              fields: ['region'],
              collapse_by: 'sum',
            },
            {
              operation: 'terms',
              size: 5,
              fields: ['category'],
              collapse_by: 'avg',
            },
            {
              operation: 'terms',
              size: 5,
              fields: ['product'],
            },
          ],
        };

        expect(() => mosaicStateSchema.validate(input)).not.toThrow();
      });

      it('throws when group_by has multiple non-collapsed dimensions', () => {
        const input: MosaicState = {
          ...baseMosaicConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              size: 5,
              fields: ['category'],
            },
            {
              operation: 'terms',
              size: 5,
              fields: ['region'],
            },
          ],
        };

        expect(() => mosaicStateSchema.validate(input)).toThrow(
          /only a single non-collapsed dimension is allowed/i
        );
      });

      it('throws when group_by has multiple non-collapsed dimensions with some collapsed', () => {
        const input: MosaicState = {
          ...baseMosaicConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              size: 5,
              fields: ['region'],
              collapse_by: 'sum',
            },
            {
              operation: 'terms',
              size: 5,
              fields: ['category'],
            },
            {
              operation: 'terms',
              size: 5,
              fields: ['product'],
            },
          ],
        };

        expect(() => mosaicStateSchema.validate(input)).toThrow(
          /only a single non-collapsed dimension is allowed/i
        );
      });

      it('allows single non-collapsed dimension in group_breakdown_by', () => {
        const input: MosaicState = {
          ...baseMosaicConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              size: 5,
              fields: ['category'],
            },
          ],
          group_breakdown_by: [
            {
              operation: 'date_histogram',
              field: 'date_field',
              suggested_interval: 'auto',
              use_original_time_range: false,
              include_empty_rows: true,
            },
          ],
        };

        expect(() => mosaicStateSchema.validate(input)).not.toThrow();
      });

      it('allows multiple collapsed dimensions in group_breakdown_by', () => {
        const input: MosaicState = {
          ...baseMosaicConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              size: 5,
              fields: ['category'],
            },
          ],
          group_breakdown_by: [
            {
              operation: 'date_histogram',
              field: 'date_field',
              collapse_by: 'sum',
              suggested_interval: 'auto',
              use_original_time_range: false,
              include_empty_rows: true,
            },
            {
              operation: 'histogram',
              field: 'price_field',
              collapse_by: 'avg',
              granularity: 'auto',
              include_empty_rows: false,
            },
            {
              operation: 'terms',
              size: 5,
              fields: ['brand'],
            },
          ],
        };

        expect(() => mosaicStateSchema.validate(input)).not.toThrow();
      });

      it('throws when group_breakdown_by has multiple non-collapsed dimensions', () => {
        const input: MosaicState = {
          ...baseMosaicConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              size: 5,
              fields: ['category'],
            },
          ],
          group_breakdown_by: [
            {
              operation: 'date_histogram',
              field: 'date_field',
              suggested_interval: 'auto',
              use_original_time_range: false,
              include_empty_rows: true,
            },
            {
              operation: 'histogram',
              field: 'price_field',
              granularity: 'auto',
              include_empty_rows: false,
            },
          ],
        };

        expect(() => mosaicStateSchema.validate(input)).toThrow(
          /only a single non-collapsed dimension is allowed/i
        );
      });

      it('throws when group_breakdown_by has multiple non-collapsed dimensions with some collapsed', () => {
        const input: MosaicState = {
          ...baseMosaicConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              size: 5,
              fields: ['category'],
            },
          ],
          group_breakdown_by: [
            {
              operation: 'date_histogram',
              field: 'date_field',
              collapse_by: 'sum',
              suggested_interval: 'auto',
              use_original_time_range: false,
              include_empty_rows: true,
            },
            {
              operation: 'histogram',
              field: 'price_field',
              granularity: 'auto',
              include_empty_rows: false,
            },
            {
              operation: 'terms',
              size: 5,
              fields: ['brand'],
            },
          ],
        };

        expect(() => mosaicStateSchema.validate(input)).toThrow(
          /only a single non-collapsed dimension is allowed/i
        );
      });

      it('allows valid combination with both outer and inner having multiple collapsed dimensions', () => {
        const input: MosaicState = {
          ...baseMosaicConfig,
          metrics: [
            {
              operation: 'sum',
              empty_as_null: false,
              field: 'sales',
            },
          ],
          group_by: [
            {
              operation: 'terms',
              size: 5,
              fields: ['region'],
              collapse_by: 'sum',
            },
            {
              operation: 'terms',
              size: 5,
              fields: ['category'],
              collapse_by: 'avg',
            },
            {
              operation: 'terms',
              size: 5,
              fields: ['product'],
            },
          ],
          group_breakdown_by: [
            {
              operation: 'date_histogram',
              field: 'date_field',
              collapse_by: 'max',
              suggested_interval: 'auto',
              use_original_time_range: false,
              include_empty_rows: true,
            },
            {
              operation: 'histogram',
              field: 'price_field',
              collapse_by: 'min',
              granularity: 'auto',
              include_empty_rows: false,
            },
            {
              operation: 'terms',
              size: 5,
              fields: ['brand'],
            },
          ],
        };

        expect(() => mosaicStateSchema.validate(input)).not.toThrow();
      });
    });
  });
});
