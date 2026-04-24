/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_REFERENCE_TYPE } from '@kbn/as-code-data-views-schema';
import type { MosaicConfig, MosaicConfigESQL, MosaicConfigNoESQL } from './mosaic';
import { mosaicConfigSchema } from './mosaic';

describe('Mosaic Schema', () => {
  const baseMosaicConfig: Pick<
    MosaicConfigNoESQL,
    'type' | 'data_source' | 'ignore_global_filters' | 'sampling'
  > = {
    type: 'mosaic',
    data_source: {
      type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
      ref_id: 'test-data-view',
    },
    ignore_global_filters: false,
    sampling: 0,
  };

  describe('Non-ES|QL Schema', () => {
    it('validates minimal configuration with single outer grouping', () => {
      const input: MosaicConfig = {
        ...baseMosaicConfig,
        metric: {
          operation: 'count',
          empty_as_null: true,
        },
        group_by: [
          {
            operation: 'terms',
            limit: 5,
            fields: ['category'],
          },
        ],
      };

      const validated = mosaicConfigSchema.validate(input);
      expect(validated.type).toBe('mosaic');
      expect(validated.metric).toHaveProperty('operation', 'count');
      expect(validated.group_by).toHaveLength(1);
    });

    it('should throw if no grouping is defined', () => {
      const input = {
        ...baseMosaicConfig,
        metric: {
          operation: 'count',
          empty_as_null: true,
        },
      };

      expect(() => mosaicConfigSchema.validate(input)).toThrow();
    });

    it('validates configuration with both outer and inner grouping', () => {
      const input: MosaicConfig = {
        ...baseMosaicConfig,
        metric: {
          operation: 'sum',
          empty_as_null: false,
          field: 'sales',
        },
        group_by: [
          {
            operation: 'terms',
            limit: 5,
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

      const validated = mosaicConfigSchema.validate(input);
      expect(validated.metric).toHaveProperty('operation', 'sum');
      expect(validated.group_by).toHaveLength(1);
      expect(validated.group_breakdown_by).toHaveLength(1);
    });

    it('validates configuration with collapsed dimensions', () => {
      const input: MosaicConfig = {
        ...baseMosaicConfig,
        metric: {
          operation: 'count',
          empty_as_null: true,
        },
        group_by: [
          {
            operation: 'terms',
            limit: 5,
            fields: ['region'],
            collapse_by: 'sum',
          },
          {
            operation: 'terms',
            limit: 5,
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

      const validated = mosaicConfigSchema.validate(input);
      expect(validated.group_by).toHaveLength(2);
      expect(validated.group_breakdown_by).toHaveLength(1);
    });

    it('validates full configuration with legend and value display', () => {
      const input: MosaicConfig = {
        ...baseMosaicConfig,
        title: 'Sales Mosaic',
        description: 'Sales data visualization',
        metric: {
          operation: 'sum',
          empty_as_null: false,
          field: 'sales',
        },
        group_by: [
          {
            operation: 'terms',
            limit: 5,
            fields: ['category'],
          },
        ],
        group_breakdown_by: [
          {
            operation: 'terms',
            limit: 5,
            fields: ['subcategory'],
          },
        ],
        legend: {
          nested: true,
          truncate_after_lines: 5,
          visibility: 'visible',
          size: 's',
        },
        styling: {
          values: {
            visible: false,
          },
        },
      };

      const validated = mosaicConfigSchema.validate(input);
      expect(validated.title).toBe('Sales Mosaic');
      expect(validated.legend?.nested).toBe(true);
      expect(validated.styling?.values?.visible).toBe(false);
    });

    it('throws on empty group_by array', () => {
      const input: MosaicConfig = {
        ...baseMosaicConfig,
        metric: {
          operation: 'count',
          empty_as_null: true,
        },
        group_by: [],
      };

      expect(() => mosaicConfigSchema.validate(input)).toThrow();
    });

    it('throws on empty group_breakdown_by array', () => {
      const input: MosaicConfig = {
        ...baseMosaicConfig,
        metric: {
          operation: 'count',
          empty_as_null: true,
        },
        group_by: [
          {
            operation: 'terms',
            limit: 5,
            fields: ['category'],
          },
        ],
        group_breakdown_by: [],
      };

      expect(() => mosaicConfigSchema.validate(input)).toThrow();
    });

    describe('Grouping Cardinality Validation', () => {
      it('allows single non-collapsed dimension in group_by', () => {
        const input: MosaicConfig = {
          ...baseMosaicConfig,
          metric: {
            operation: 'count',
            empty_as_null: true,
          },
          group_by: [
            {
              operation: 'terms',
              limit: 5,
              fields: ['category'],
            },
          ],
        };

        expect(() => mosaicConfigSchema.validate(input)).not.toThrow();
      });

      it('allows multiple collapsed dimensions in group_by', () => {
        const input: MosaicConfig = {
          ...baseMosaicConfig,
          metric: {
            operation: 'count',
            empty_as_null: true,
          },
          group_by: [
            {
              operation: 'terms',
              limit: 5,
              fields: ['region'],
              collapse_by: 'sum',
            },
            {
              operation: 'terms',
              limit: 5,
              fields: ['category'],
              collapse_by: 'avg',
            },
            {
              operation: 'terms',
              limit: 5,
              fields: ['product'],
            },
          ],
        };

        expect(() => mosaicConfigSchema.validate(input)).not.toThrow();
      });

      it('throws when group_by has multiple non-collapsed dimensions', () => {
        const input: MosaicConfig = {
          ...baseMosaicConfig,
          metric: {
            operation: 'count',
            empty_as_null: true,
          },
          group_by: [
            {
              operation: 'terms',
              limit: 5,
              fields: ['category'],
            },
            {
              operation: 'terms',
              limit: 5,
              fields: ['region'],
            },
          ],
        };

        expect(() => mosaicConfigSchema.validate(input)).toThrow(
          /only a single non-collapsed dimension is allowed/i
        );
      });

      it('throws when group_by has multiple non-collapsed dimensions with some collapsed', () => {
        const input: MosaicConfig = {
          ...baseMosaicConfig,
          metric: {
            operation: 'count',
            empty_as_null: true,
          },
          group_by: [
            {
              operation: 'terms',
              limit: 5,
              fields: ['region'],
              collapse_by: 'sum',
            },
            {
              operation: 'terms',
              limit: 5,
              fields: ['category'],
            },
            {
              operation: 'terms',
              limit: 5,
              fields: ['product'],
            },
          ],
        };

        expect(() => mosaicConfigSchema.validate(input)).toThrow(
          /only a single non-collapsed dimension is allowed/i
        );
      });

      it('allows single non-collapsed dimension in group_breakdown_by', () => {
        const input: MosaicConfig = {
          ...baseMosaicConfig,
          metric: {
            operation: 'count',
            empty_as_null: true,
          },
          group_by: [
            {
              operation: 'terms',
              limit: 5,
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

        expect(() => mosaicConfigSchema.validate(input)).not.toThrow();
      });

      it('allows multiple collapsed dimensions in group_breakdown_by', () => {
        const input: MosaicConfig = {
          ...baseMosaicConfig,
          metric: {
            operation: 'count',
            empty_as_null: true,
          },
          group_by: [
            {
              operation: 'terms',
              limit: 5,
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
              limit: 5,
              fields: ['brand'],
            },
          ],
        };

        expect(() => mosaicConfigSchema.validate(input)).not.toThrow();
      });

      it('throws when group_breakdown_by has multiple non-collapsed dimensions', () => {
        const input: MosaicConfig = {
          ...baseMosaicConfig,
          metric: {
            operation: 'count',
            empty_as_null: true,
          },
          group_by: [
            {
              operation: 'terms',
              limit: 5,
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

        expect(() => mosaicConfigSchema.validate(input)).toThrow(
          /only a single non-collapsed dimension is allowed/i
        );
      });

      it('throws when group_breakdown_by has multiple non-collapsed dimensions with some collapsed', () => {
        const input: MosaicConfig = {
          ...baseMosaicConfig,
          metric: {
            operation: 'count',
            empty_as_null: true,
          },
          group_by: [
            {
              operation: 'terms',
              limit: 5,
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
              limit: 5,
              fields: ['brand'],
            },
          ],
        };

        expect(() => mosaicConfigSchema.validate(input)).toThrow(
          /only a single non-collapsed dimension is allowed/i
        );
      });

      it('throws when no grouping dimension are defined', () => {
        const input: MosaicConfig = {
          ...baseMosaicConfig,
          metric: {
            operation: 'count',
            empty_as_null: true,
          },
        };

        expect(() => mosaicConfigSchema.validate(input)).toThrow(
          /Either a group_by or a group_breakdown_by dimension must be specified/i
        );
      });

      it('allows only the group_breakdown_by definition without group_by', () => {
        const input: MosaicConfig = {
          ...baseMosaicConfig,
          metric: {
            operation: 'count',
            empty_as_null: true,
          },
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
              collapse_by: 'sum',
            },
            {
              operation: 'terms',
              limit: 5,
              fields: ['brand'],
            },
          ],
        };

        expect(() => mosaicConfigSchema.validate(input)).not.toThrow();
      });

      it('allows valid combination with both outer and inner having multiple collapsed dimensions', () => {
        const input: MosaicConfig = {
          ...baseMosaicConfig,
          metric: {
            operation: 'sum',
            empty_as_null: false,
            field: 'sales',
          },
          group_by: [
            {
              operation: 'terms',
              limit: 5,
              fields: ['region'],
              collapse_by: 'sum',
            },
            {
              operation: 'terms',
              limit: 5,
              fields: ['category'],
              collapse_by: 'avg',
            },
            {
              operation: 'terms',
              limit: 5,
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
              limit: 5,
              fields: ['brand'],
            },
          ],
        };

        expect(() => mosaicConfigSchema.validate(input)).not.toThrow();
      });
    });
  });

  describe('ES|QL Schema', () => {
    const baseESQLMosaicConfig: Pick<
      MosaicConfigESQL,
      'type' | 'data_source' | 'ignore_global_filters' | 'sampling'
    > = {
      type: 'mosaic',
      data_source: {
        type: 'esql',
        query: 'FROM blah | KEEP foo, bar',
      },
      ignore_global_filters: false,
      sampling: 0,
    };

    it('throws when no grouping dimension are defined', () => {
      const input: MosaicConfig = {
        ...baseESQLMosaicConfig,
        metric: {
          column: 'foo',
        },
      };

      expect(() => mosaicConfigSchema.validate(input)).toThrow(
        /Either a group_by or a group_breakdown_by dimension must be specified/i
      );
    });

    it('allows only the group_breakdown_by definition without group_by', () => {
      const input: MosaicConfig = {
        ...baseESQLMosaicConfig,
        metric: {
          column: 'foo',
        },
        group_breakdown_by: [
          {
            column: 'bar',
            collapse_by: 'sum',
          },
          {
            column: 'bar',
            collapse_by: 'sum',
          },
          {
            column: 'bar',
          },
        ],
      };

      expect(() => mosaicConfigSchema.validate(input)).not.toThrow();
    });
  });
});
