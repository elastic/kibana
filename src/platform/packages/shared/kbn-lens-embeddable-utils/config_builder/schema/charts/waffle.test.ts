/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_REFERENCE_TYPE } from '@kbn/as-code-data-views-schema';
import type { WaffleConfigNoESQL, WaffleConfigESQL } from './waffle';
import { waffleConfigSchema } from './waffle';

describe('Waffle Schema', () => {
  describe('Non-ES|QL Schema', () => {
    const baseWaffleConfig = {
      type: 'waffle',
      ignore_global_filters: false,
      sampling: 1,
      data_source: {
        type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
        ref_id: 'test-data-view',
      },
    } satisfies Partial<WaffleConfigNoESQL>;

    it('validates minimal configuration with single metric', () => {
      const input: WaffleConfigNoESQL = {
        ...baseWaffleConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: false,
          },
        ],
      };

      const validated = waffleConfigSchema.validate(input);
      expect(validated.type).toBe('waffle');
      expect(validated.metrics).toHaveLength(1);
      expect(validated.metrics[0]).toHaveProperty('operation', 'count');
    });

    it('validates configuration with metrics and group_by', () => {
      const input: WaffleConfigNoESQL = {
        ...baseWaffleConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: false,
          },
        ],
        group_by: [
          {
            operation: 'terms',
            fields: ['category'],
            limit: 5,
          },
        ],
      };

      const validated = waffleConfigSchema.validate(input);
      expect(validated.metrics).toHaveLength(1);
      expect(validated.group_by).toHaveLength(1);
    });

    it('validates full configuration with waffle-specific legend values', () => {
      const input: WaffleConfigNoESQL = {
        ...baseWaffleConfig,
        title: 'Sales Waffle',
        description: 'Sales data visualization',
        metrics: [
          {
            operation: 'sum',
            field: 'sales',
            empty_as_null: false,
            color: {
              type: 'static',
              color: '#FF0000',
            },
          },
        ],
        group_by: [
          {
            operation: 'terms',
            fields: ['category'],
            limit: 5,
          },
        ],
        legend: {
          values: ['absolute'],
          truncate_after_lines: 2,
          visibility: 'visible',
          size: 'm',
        },
        styling: {
          values: {
            visible: true,
            mode: 'percentage',
            percent_decimals: 1,
          },
        },
      };

      const validated = waffleConfigSchema.validate(input);
      expect(validated.title).toBe('Sales Waffle');
      expect(validated.legend?.values).toEqual(['absolute']);
      expect(validated.styling?.values?.mode).toBe('percentage');
    });

    it('validates multiple metrics without group_by', () => {
      const input: WaffleConfigNoESQL = {
        ...baseWaffleConfig,
        metrics: [
          {
            operation: 'count',
            field: 'test_field',
            empty_as_null: true,
          },
          {
            operation: 'sum',
            field: 'another_field',
            empty_as_null: true,
          },
        ],
      };

      const validated = waffleConfigSchema.validate(input);
      expect(validated.metrics).toHaveLength(2);
    });

    it('validates configuration with color by value', () => {
      const input: WaffleConfigNoESQL = {
        ...baseWaffleConfig,
        metrics: [
          {
            operation: 'count',
            field: 'test_field',
            empty_as_null: true,
          },
        ],
        group_by: [
          {
            operation: 'terms',
            fields: ['category'],
            limit: 5,
            color: {
              mode: 'categorical',
              palette: 'default',
              mapping: [
                {
                  values: ['success'],
                  color: {
                    type: 'from_palette',
                    palette: 'default',
                    index: 6,
                  },
                },
                {
                  values: ['info'],
                  color: {
                    type: 'from_palette',
                    palette: 'default',
                    index: 9,
                  },
                },
                {
                  values: ['security'],
                  color: {
                    type: 'from_palette',
                    palette: 'default',
                    index: 4,
                  },
                },
                {
                  values: ['__other__'],
                  color: {
                    type: 'from_palette',
                    palette: 'default',
                    index: 5,
                  },
                },
              ],
            },
          },
        ],
      };

      const validated = waffleConfigSchema.validate(input);
      expect(validated.group_by?.[0].color).toHaveProperty('mode', 'categorical');
    });

    it('validates configuration with collapsed dimensions', () => {
      const input: WaffleConfigNoESQL = {
        ...baseWaffleConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: true,
          },
        ],
        group_by: [
          {
            operation: 'terms',
            fields: ['region'],
            collapse_by: 'sum',
            limit: 5,
          },
          {
            operation: 'terms',
            fields: ['category'],
            limit: 5,
          },
        ],
      };

      const validated = waffleConfigSchema.validate(input);
      expect(validated.group_by).toHaveLength(2);
      expect(validated.group_by?.[0].collapse_by).toBe('sum');
    });

    it('throws on empty metrics array', () => {
      const input: WaffleConfigNoESQL = {
        ...baseWaffleConfig,
        metrics: [],
      };

      expect(() => waffleConfigSchema.validate(input)).toThrow();
    });

    it('throws on empty group_by array', () => {
      const input: WaffleConfigNoESQL = {
        ...baseWaffleConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: true,
          },
        ],
        group_by: [],
      };

      expect(() => waffleConfigSchema.validate(input)).toThrow();
    });

    describe('Grouping Validation', () => {
      it('allows single metric with single non-collapsed breakdown', () => {
        const input: WaffleConfigNoESQL = {
          ...baseWaffleConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: false,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              fields: ['category'],
              limit: 5,
            },
          ],
        };

        expect(() => waffleConfigSchema.validate(input)).not.toThrow();
      });

      it('allows single metric with multiple collapsed breakdowns and one non-collapsed', () => {
        const input: WaffleConfigNoESQL = {
          ...baseWaffleConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: false,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              fields: ['region'],
              collapse_by: 'sum',
              limit: 5,
            },
            {
              operation: 'terms',
              fields: ['country'],
              collapse_by: 'avg',
              limit: 5,
            },
            {
              operation: 'terms',
              fields: ['category'],
              limit: 5,
            },
          ],
        };

        expect(() => waffleConfigSchema.validate(input)).not.toThrow();
      });

      it('throws when single metric has multiple non-collapsed breakdowns', () => {
        const input: WaffleConfigNoESQL = {
          ...baseWaffleConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: false,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              fields: ['category'],
              limit: 5,
            },
            {
              operation: 'terms',
              fields: ['region'],
              limit: 5,
            },
          ],
        };

        expect(() => waffleConfigSchema.validate(input)).toThrow(
          /Only a single non-collapsed dimension is allowed for group_by/i
        );
      });

      it('allows multiple metrics without group_by', () => {
        const input: WaffleConfigNoESQL = {
          ...baseWaffleConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: false,
            },
            {
              operation: 'sum',
              field: 'sales',
              empty_as_null: false,
            },
          ],
        };

        expect(() => waffleConfigSchema.validate(input)).not.toThrow();
      });

      it('throws with multiple metrics and a single non-collapsed breakdown', () => {
        const input: WaffleConfigNoESQL = {
          ...baseWaffleConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: false,
            },
            {
              operation: 'sum',
              field: 'sales',
              empty_as_null: false,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              fields: ['category'],
              limit: 5,
            },
          ],
        };

        expect(() => waffleConfigSchema.validate(input)).toThrow();
      });

      it('allows multiple metrics with multiple collapsed breakdowns', () => {
        const input: WaffleConfigNoESQL = {
          ...baseWaffleConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: false,
            },
            {
              operation: 'sum',
              field: 'sales',
              empty_as_null: false,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              fields: ['region'],
              collapse_by: 'sum',
              limit: 5,
            },
            {
              operation: 'date_histogram',
              field: 'date_field',
              suggested_interval: 'auto',
              use_original_time_range: false,
              include_empty_rows: true,
              collapse_by: 'avg',
            },
          ],
        };

        expect(() => waffleConfigSchema.validate(input)).not.toThrow();
      });

      it('throws when multiple metrics have one collapsed and multiple non-collapsed breakdowns', () => {
        const input: WaffleConfigNoESQL = {
          ...baseWaffleConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: false,
            },
            {
              operation: 'sum',
              field: 'sales',
              empty_as_null: false,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              fields: ['region'],
              collapse_by: 'sum',
              limit: 5,
            },
            {
              operation: 'terms',
              fields: ['category'],
              limit: 5,
            },
            {
              operation: 'date_histogram',
              field: 'date_field',
              suggested_interval: 'auto',
              use_original_time_range: false,
              include_empty_rows: true,
            },
          ],
        };

        expect(() => waffleConfigSchema.validate(input)).toThrow(
          /only collapsed group_by dimensions are allowed/i
        );
      });
    });
  });

  describe('ES|QL Schema', () => {
    const baseESQLWaffleConfig = {
      type: 'waffle',
      ignore_global_filters: false,
      sampling: 1,
      data_source: {
        type: 'esql',
        query: 'FROM my-index | STATS count() BY category',
      },
    } satisfies Partial<WaffleConfigESQL>;

    it('validates minimal ES|QL configuration', () => {
      const input: WaffleConfigESQL = {
        ...baseESQLWaffleConfig,
        metrics: [
          {
            column: 'count',
          },
        ],
      };

      const validated = waffleConfigSchema.validate(input);
      expect(validated.data_source.type).toBe('esql');
      expect(validated.metrics[0]).toHaveProperty('column', 'count');
    });

    it('validates ES|QL configuration with group_by', () => {
      const input: WaffleConfigESQL = {
        ...baseESQLWaffleConfig,
        metrics: [
          {
            column: 'count',
          },
        ],
        group_by: [
          {
            column: 'category',
          },
        ],
      };

      const validated = waffleConfigSchema.validate(input);
      expect(validated.group_by).toHaveLength(1);
      if (validated.group_by?.[0] && 'column' in validated.group_by?.[0]) {
        expect(validated.group_by?.[0]?.column).toBe('category');
      }
    });

    it('validates ES|QL configuration with multiple metrics', () => {
      const input: WaffleConfigESQL = {
        ...baseESQLWaffleConfig,
        metrics: [
          {
            column: 'count',
          },
          {
            column: 'sum_sales',
          },
        ],
      };

      const validated = waffleConfigSchema.validate(input);
      expect(validated.metrics).toHaveLength(2);
    });
  });
});
