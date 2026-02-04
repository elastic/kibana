/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WaffleState, WaffleStateESQL, WaffleStateNoESQL } from './waffle';
import { waffleStateSchema } from './waffle';

describe('Waffle Schema', () => {
  const baseWaffleConfig: Pick<
    WaffleStateNoESQL,
    'type' | 'ignore_global_filters' | 'sampling' | 'dataset'
  > = {
    type: 'waffle',
    ignore_global_filters: false,
    sampling: 1,
    dataset: {
      type: 'dataView',
      id: 'test-data-view',
    },
  };

  describe('Non-ES|QL Schema', () => {
    it('validates minimal configuration with single metric', () => {
      const input: WaffleState = {
        ...baseWaffleConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: false,
          },
        ],
      };

      const validated = waffleStateSchema.validate(input);
      expect(validated.type).toBe('waffle');
      expect(validated.metrics).toHaveLength(1);
      expect(validated.metrics[0].operation).toBe('count');
    });

    it('validates configuration with metrics and group_by', () => {
      const input: WaffleState = {
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
            size: 5,
          },
        ],
      };

      const validated = waffleStateSchema.validate(input);
      expect(validated.metrics).toHaveLength(1);
      expect(validated.group_by).toHaveLength(1);
    });

    it('validates full configuration with waffle-specific legend values', () => {
      const input: WaffleState = {
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
            size: 5,
          },
        ],
        legend: {
          values: ['absolute'],
          truncate_after_lines: 2,
          visible: 'show',
          size: 'medium',
        },
        value_display: {
          mode: 'percentage',
          percent_decimals: 1,
        },
      };

      const validated = waffleStateSchema.validate(input);
      expect(validated.title).toBe('Sales Waffle');
      expect(validated.legend?.values).toEqual(['absolute']);
      expect(validated.value_display?.mode).toBe('percentage');
    });

    it('validates multiple metrics without group_by', () => {
      const input: WaffleState = {
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

      const validated = waffleStateSchema.validate(input);
      expect(validated.metrics).toHaveLength(2);
    });

    it('validates configuration with color by value', () => {
      const input: WaffleState = {
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
            size: 5,
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

      const validated = waffleStateSchema.validate(input);
      expect(validated.group_by?.[0].color).toHaveProperty('mode', 'categorical');
    });

    it('validates configuration with collapsed dimensions', () => {
      const input: WaffleState = {
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
            size: 5,
          },
          {
            operation: 'terms',
            fields: ['category'],
            size: 5,
          },
        ],
      };

      const validated = waffleStateSchema.validate(input);
      expect(validated.group_by).toHaveLength(2);
      expect(validated.group_by?.[0].collapse_by).toBe('sum');
    });

    it('throws on empty metrics array', () => {
      const input: WaffleState = {
        ...baseWaffleConfig,
        metrics: [],
      };

      expect(() => waffleStateSchema.validate(input)).toThrow();
    });

    it('throws on empty group_by array', () => {
      const input: WaffleState = {
        ...baseWaffleConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: true,
          },
        ],
        group_by: [],
      };

      expect(() => waffleStateSchema.validate(input)).toThrow();
    });

    describe('Grouping Validation', () => {
      it('allows single metric with single non-collapsed breakdown', () => {
        const input: WaffleState = {
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
              size: 5,
            },
          ],
        };

        expect(() => waffleStateSchema.validate(input)).not.toThrow();
      });

      it('allows single metric with multiple collapsed breakdowns and one non-collapsed', () => {
        const input: WaffleState = {
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
              size: 5,
            },
            {
              operation: 'terms',
              fields: ['country'],
              collapse_by: 'avg',
              size: 5,
            },
            {
              operation: 'terms',
              fields: ['category'],
              size: 5,
            },
          ],
        };

        expect(() => waffleStateSchema.validate(input)).not.toThrow();
      });

      it('throws when single metric has multiple non-collapsed breakdowns', () => {
        const input: WaffleState = {
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
              size: 5,
            },
            {
              operation: 'terms',
              fields: ['region'],
              size: 5,
            },
          ],
        };

        expect(() => waffleStateSchema.validate(input)).toThrow(
          /Only a single non-collapsed dimension is allowed for group_by/i
        );
      });

      it('allows multiple metrics without group_by', () => {
        const input: WaffleState = {
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

        expect(() => waffleStateSchema.validate(input)).not.toThrow();
      });

      it('throws with multiple metrics and a single non-collapsed breakdown', () => {
        const input: WaffleState = {
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
              size: 5,
            },
          ],
        };

        expect(() => waffleStateSchema.validate(input)).toThrow();
      });

      it('allows multiple metrics with multiple collapsed breakdowns', () => {
        const input: WaffleState = {
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
              size: 5,
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

        expect(() => waffleStateSchema.validate(input)).not.toThrow();
      });

      it('throws when multiple metrics have one collapsed and multiple non-collapsed breakdowns', () => {
        const input: WaffleState = {
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
              size: 5,
            },
            {
              operation: 'terms',
              fields: ['category'],
              size: 5,
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

        expect(() => waffleStateSchema.validate(input)).toThrow(
          /only collapsed group_by dimensions are allowed/i
        );
      });
    });
  });

  describe('ES|QL Schema', () => {
    const baseESQLWaffleConfig: Pick<
      WaffleStateESQL,
      'type' | 'ignore_global_filters' | 'sampling' | 'dataset'
    > = {
      type: 'waffle',
      ignore_global_filters: false,
      sampling: 1,
      dataset: {
        type: 'esql',
        query: 'FROM my-index | STATS count() BY category',
      },
    };
    it('validates minimal ES|QL configuration', () => {
      const input: WaffleState = {
        ...baseESQLWaffleConfig,
        metrics: [
          {
            operation: 'value',
            column: 'count',
          },
        ],
      };

      const validated = waffleStateSchema.validate(input);
      expect(validated.dataset.type).toBe('esql');
      expect(validated.metrics[0].operation).toBe('value');
    });

    it('validates ES|QL configuration with group_by', () => {
      const input: WaffleState = {
        ...baseESQLWaffleConfig,
        metrics: [
          {
            operation: 'value',
            column: 'count',
          },
        ],
        group_by: [
          {
            operation: 'value',
            column: 'category',
          },
        ],
      };

      const validated = waffleStateSchema.validate(input);
      expect(validated.group_by).toHaveLength(1);
      if (validated.group_by?.[0] && 'column' in validated.group_by?.[0]) {
        expect(validated.group_by?.[0]?.column).toBe('category');
      }
    });

    it('validates ES|QL configuration with multiple metrics', () => {
      const input: WaffleState = {
        ...baseESQLWaffleConfig,
        metrics: [
          {
            operation: 'value',
            column: 'count',
          },
          {
            operation: 'value',
            column: 'sum_sales',
          },
        ],
      };

      const validated = waffleStateSchema.validate(input);
      expect(validated.metrics).toHaveLength(2);
    });
  });
});
