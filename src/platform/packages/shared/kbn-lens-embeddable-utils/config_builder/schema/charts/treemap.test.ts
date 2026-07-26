/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_REFERENCE_TYPE } from '@kbn/as-code-data-views-schema';
import type { TreemapConfigESQL, TreemapConfigNoESQL } from './treemap';
import { treemapConfigSchema } from './treemap';

describe('Treemap Schema', () => {
  describe('Non-ES|QL Schema', () => {
    const baseTreemapConfig = {
      type: 'treemap',
      data_source: {
        type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
        ref_id: 'test-data-view',
      },
      ignore_global_filters: false,
      sampling: 1,
    } satisfies Partial<TreemapConfigNoESQL>;

    it('validates minimal configuration with single metric', () => {
      const input: TreemapConfigNoESQL = {
        ...baseTreemapConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: false,
          },
        ],
      };

      const validated = treemapConfigSchema.validate(input);
      expect(validated.type).toBe('treemap');
      expect(validated.metrics).toHaveLength(1);
      expect(validated.metrics[0]).toHaveProperty('operation', 'count');
    });

    it('validates configuration with metrics and group_by', () => {
      const input: TreemapConfigNoESQL = {
        ...baseTreemapConfig,
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

      const validated = treemapConfigSchema.validate(input);
      expect(validated.metrics).toHaveLength(1);
      expect(validated.group_by).toHaveLength(1);
    });

    it('validates full configuration with treemap-specific label position', () => {
      const input: TreemapConfigNoESQL = {
        ...baseTreemapConfig,
        title: 'Sales Treemap',
        description: 'Sales data visualization',
        metrics: [
          {
            operation: 'sum',
            field: 'sales',
            empty_as_null: true,
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
          nested: true,
          truncate_after_lines: 3,
          visibility: 'auto',
          size: 'l',
        },
        styling: {
          labels: { visible: true },
          values: {
            visible: true,
            mode: 'absolute',
          },
        },
      };

      const validated = treemapConfigSchema.validate(input);
      expect(validated.title).toBe('Sales Treemap');
      expect(validated.legend?.nested).toBe(true);
      expect(validated.styling?.labels?.visible).toBe(true);
      expect(validated.styling?.values?.visible).toBe(true);
      expect(validated.styling?.values?.mode).toBe('absolute');
    });

    it('validates configuration with two group_by dimensions', () => {
      const input: TreemapConfigNoESQL = {
        ...baseTreemapConfig,
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
            fields: ['subcategory'],
            limit: 5,
          },
        ],
      };

      const validated = treemapConfigSchema.validate(input);
      expect(validated.group_by).toHaveLength(2);
    });

    it('validates configuration with color mapping', () => {
      const input: TreemapConfigNoESQL = {
        ...baseTreemapConfig,
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

      const validated = treemapConfigSchema.validate(input);
      expect(validated.group_by?.[0].color).toHaveProperty('mode', 'categorical');
    });

    it('validates configuration with collapsed dimensions', () => {
      const input: TreemapConfigNoESQL = {
        ...baseTreemapConfig,
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
            fields: ['category'],
            limit: 5,
          },
        ],
      };

      const validated = treemapConfigSchema.validate(input);
      expect(validated.group_by).toHaveLength(2);
      expect(validated.group_by?.[0].collapse_by).toBe('sum');
    });

    it('throws on empty metrics array', () => {
      const input: TreemapConfigNoESQL = {
        ...baseTreemapConfig,
        metrics: [],
      };

      expect(() => treemapConfigSchema.validate(input)).toThrow();
    });

    it('throws on empty group_by array', () => {
      const input: TreemapConfigNoESQL = {
        ...baseTreemapConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: false,
          },
        ],
        group_by: [],
      };

      expect(() => treemapConfigSchema.validate(input)).toThrow();
    });

    describe('Grouping Validation', () => {
      describe('Single Metric Scenarios', () => {
        it('allows single metric with single non-collapsed breakdown', () => {
          const input: TreemapConfigNoESQL = {
            ...baseTreemapConfig,
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

          expect(() => treemapConfigSchema.validate(input)).not.toThrow();
        });

        it('allows single metric with two non-collapsed breakdowns', () => {
          const input: TreemapConfigNoESQL = {
            ...baseTreemapConfig,
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
                fields: ['subcategory'],
                limit: 5,
              },
            ],
          };

          expect(() => treemapConfigSchema.validate(input)).not.toThrow();
        });

        it('allows single metric with multiple collapsed and two non-collapsed breakdowns', () => {
          const input: TreemapConfigNoESQL = {
            ...baseTreemapConfig,
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
              {
                operation: 'terms',
                fields: ['subcategory'],
                limit: 5,
              },
            ],
          };

          expect(() => treemapConfigSchema.validate(input)).not.toThrow();
        });

        it('throws when single metric has more than two non-collapsed breakdowns', () => {
          const input: TreemapConfigNoESQL = {
            ...baseTreemapConfig,
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
                fields: ['subcategory'],
                limit: 5,
              },
              {
                operation: 'terms',
                fields: ['region'],
                limit: 5,
              },
            ],
          };

          expect(() => treemapConfigSchema.validate(input)).toThrow(
            / The number of non-collapsed group_by dimensions must not exceed 2/i
          );
        });
      });

      describe('Multiple Metrics Scenarios', () => {
        it('allows multiple metrics without group_by', () => {
          const input: TreemapConfigNoESQL = {
            ...baseTreemapConfig,
            metrics: [
              {
                operation: 'count',
                empty_as_null: false,
              },
              {
                operation: 'sum',
                field: 'sales',
                empty_as_null: true,
              },
            ],
          };

          expect(() => treemapConfigSchema.validate(input)).not.toThrow();
        });

        it('allows multiple metrics with single non-collapsed breakdown', () => {
          const input = {
            ...baseTreemapConfig,
            metrics: [
              {
                operation: 'count',
                empty_as_null: false,
              },
              {
                operation: 'sum',
                field: 'sales',
                empty_as_null: true,
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

          expect(() => treemapConfigSchema.validate(input)).not.toThrow();
        });

        it('allows multiple metrics with multiple collapsed and one non-collapsed breakdown', () => {
          const input: TreemapConfigNoESQL = {
            ...baseTreemapConfig,
            metrics: [
              {
                operation: 'count',
                empty_as_null: false,
              },
              {
                operation: 'sum',
                field: 'sales',
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
                operation: 'date_histogram',
                field: 'date_field',
                collapse_by: 'avg',
                suggested_interval: 'auto',
                use_original_time_range: false,
                include_empty_rows: true,
              },
              {
                operation: 'terms',
                fields: ['category'],
                limit: 5,
              },
            ],
          };

          expect(() => treemapConfigSchema.validate(input)).not.toThrow();
        });

        it('throws when multiple metrics have two non-collapsed breakdowns', () => {
          const input: TreemapConfigNoESQL = {
            ...baseTreemapConfig,
            metrics: [
              {
                operation: 'count',
                empty_as_null: false,
              },
              {
                operation: 'sum',
                field: 'sales',
                empty_as_null: true,
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
                fields: ['subcategory'],
                limit: 5,
              },
            ],
          };

          expect(() => treemapConfigSchema.validate(input)).toThrow(
            /the number of non-collapsed group_by dimensions must not exceed 1/i
          );
        });

        it('throws when multiple metrics have one collapsed and two non-collapsed breakdowns', () => {
          const input: TreemapConfigNoESQL = {
            ...baseTreemapConfig,
            metrics: [
              {
                operation: 'count',
                empty_as_null: false,
              },
              {
                operation: 'sum',
                field: 'sales',
                empty_as_null: true,
              },
              {
                operation: 'average',
                field: 'price',
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
                operation: 'terms',
                fields: ['subcategory'],
                limit: 5,
              },
            ],
          };

          expect(() => treemapConfigSchema.validate(input)).toThrow(
            /the number of non-collapsed group_by dimensions must not exceed 1/i
          );
        });
      });
    });
  });

  describe('ES|QL Schema', () => {
    const baseESQLTreemapConfig = {
      type: 'treemap',
      data_source: {
        type: 'esql',
        query: 'FROM my-index | STATS ...',
      },
      ignore_global_filters: false,
      sampling: 1,
    } satisfies Partial<TreemapConfigESQL>;

    it('validates minimal ES|QL configuration', () => {
      const input: TreemapConfigESQL = {
        ...baseESQLTreemapConfig,
        metrics: [
          {
            column: 'count',
          },
        ],
      };

      const validated = treemapConfigSchema.validate(input);
      expect(validated.data_source.type).toBe('esql');
      expect(validated.metrics[0]).toHaveProperty('column', 'count');
    });

    it('validates ES|QL configuration with group_by', () => {
      const input: TreemapConfigESQL = {
        ...baseESQLTreemapConfig,
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

      const validated = treemapConfigSchema.validate(input);
      expect(validated.group_by?.[0]).toHaveProperty('column', 'category');
    });

    it('validates ES|QL configuration with full options', () => {
      const input: TreemapConfigESQL = {
        ...baseESQLTreemapConfig,
        title: 'Sales Treemap',
        metrics: [
          {
            column: 'sum_sales',
            color: {
              type: 'static',
              color: '#0000FF',
            },
          },
        ],
        group_by: [
          {
            column: 'category',
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
        legend: {
          nested: false,
          visibility: 'visible',
        },
        styling: {
          labels: { visible: true },
        },
      };

      const validated = treemapConfigSchema.validate(input);
      expect(validated.title).toBe('Sales Treemap');
      expect(validated.styling?.labels?.visible).toBe(true);
    });
  });
});
