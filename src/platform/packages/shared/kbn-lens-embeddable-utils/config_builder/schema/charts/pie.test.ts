/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_REFERENCE_TYPE } from '@kbn/as-code-data-views-schema';
import type { PieConfigESQL, PieConfigNoESQL } from './pie';
import { pieConfigSchema } from './pie';

describe('Pie Schema', () => {
  describe('pie chart type', () => {
    describe('Non-ES|QL Schema', () => {
      const basePieConfig = {
        type: 'pie',
        data_source: {
          type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
          ref_id: 'test-data-view',
        },
        ignore_global_filters: false,
        sampling: 1,
      } satisfies Partial<PieConfigNoESQL>;

      it('validates minimal configuration with single metric', () => {
        const input: PieConfigNoESQL = {
          ...basePieConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
        };

        const validated = pieConfigSchema.validate(input);
        expect(validated.type).toBe('pie');
        expect(validated.metrics).toHaveLength(1);
        expect(validated.metrics[0]).toHaveProperty('operation', 'count');
      });

      it('validates configuration with metrics and group_by', () => {
        const input: PieConfigNoESQL = {
          ...basePieConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              limit: 5,
              fields: ['category'],
            },
          ],
        };

        const validated = pieConfigSchema.validate(input);
        expect(validated.metrics).toHaveLength(1);
        expect(validated.group_by).toHaveLength(1);
      });

      it('validates configuration with donut_hole', () => {
        const input: PieConfigNoESQL = {
          ...basePieConfig,
          metrics: [
            {
              operation: 'sum',
              field: 'sales',
              empty_as_null: true,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              limit: 5,
              fields: ['category'],
            },
          ],
          styling: {
            donut_hole: 'm',
          },
        };

        const validated = pieConfigSchema.validate(input);
        expect(validated.styling?.donut_hole).toBe('m');
      });

      it('validates full configuration with specific options', () => {
        const input: PieConfigNoESQL = {
          ...basePieConfig,
          title: 'Sales Chart',
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
              limit: 5,
              fields: ['category'],
            },
          ],
          legend: {
            nested: false,
            truncate_after_lines: 2,
            visibility: 'visible',
            size: 'xl',
          },
          styling: {
            labels: { position: 'inside' },
            donut_hole: 's',
            values: {
              mode: 'percentage',
              percent_decimals: 0,
            },
          },
        };

        const validated = pieConfigSchema.validate(input);
        expect(validated.title).toBe('Sales Chart');
        expect(validated.legend?.nested).toBe(false);
        expect(validated.styling?.donut_hole).toBe('s');
        expect(validated.styling?.labels?.position).toBe('inside');
        expect(validated.styling?.values?.mode).toBe('percentage');
      });

      it('validates configuration with multiple group_by dimensions', () => {
        const input: PieConfigNoESQL = {
          ...basePieConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              limit: 5,
              fields: ['category'],
            },
            {
              operation: 'terms',
              limit: 5,
              fields: ['subcategory'],
            },
            {
              operation: 'terms',
              limit: 5,
              fields: ['brand'],
            },
          ],
        };

        const validated = pieConfigSchema.validate(input);
        expect(validated.group_by).toHaveLength(3);
      });

      it('validates configuration with color mapping', () => {
        const input: PieConfigNoESQL = {
          ...basePieConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              limit: 5,
              fields: ['category'],
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

        const validated = pieConfigSchema.validate(input);
        expect(validated.group_by?.[0].color).toHaveProperty('mode', 'categorical');
      });

      it('validates configuration with collapsed dimensions', () => {
        const input: PieConfigNoESQL = {
          ...basePieConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
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
        };

        const validated = pieConfigSchema.validate(input);
        expect(validated.group_by).toHaveLength(2);
        expect(validated.group_by?.[0].collapse_by).toBe('sum');
      });

      it('throws on empty metrics array', () => {
        const input: PieConfigNoESQL = {
          ...basePieConfig,
          metrics: [],
        };

        expect(() => pieConfigSchema.validate(input)).toThrow();
      });

      it('throws on empty group_by array', () => {
        const input: PieConfigNoESQL = {
          ...basePieConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [],
        };

        expect(() => pieConfigSchema.validate(input)).toThrow();
      });

      it('throws on invalid donut hole size', () => {
        const input: PieConfigNoESQL = {
          ...basePieConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              limit: 5,
              fields: ['category'],
            },
          ],
          styling: {
            // @ts-expect-error - invalid donut hole size
            donut_hole: 'invalid',
          },
        };

        expect(() => pieConfigSchema.validate(input)).toThrow();
      });

      it('throws on invalid label position', () => {
        const input: PieConfigNoESQL = {
          ...basePieConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [
            {
              operation: 'terms',
              limit: 5,
              fields: ['category'],
            },
          ],
          styling: {
            labels: {
              // @ts-expect-error - invalid labels position
              position: 'invalid',
            },
          },
        };

        expect(() => pieConfigSchema.validate(input)).toThrow();
      });

      describe('Grouping Validation', () => {
        describe('Single Metric Scenarios', () => {
          it('allows single metric with single non-collapsed breakdown', () => {
            const input: PieConfigNoESQL = {
              ...basePieConfig,
              metrics: [
                {
                  operation: 'count',
                  empty_as_null: true,
                },
              ],
              group_by: [
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['category'],
                },
              ],
            };

            expect(() => pieConfigSchema.validate(input)).not.toThrow();
          });

          it('allows single metric with two non-collapsed breakdowns', () => {
            const input: PieConfigNoESQL = {
              ...basePieConfig,
              metrics: [
                {
                  operation: 'count',
                  empty_as_null: true,
                },
              ],
              group_by: [
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['category'],
                },
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['subcategory'],
                },
              ],
            };

            expect(() => pieConfigSchema.validate(input)).not.toThrow();
          });

          it('allows single metric with three non-collapsed breakdowns', () => {
            const input: PieConfigNoESQL = {
              ...basePieConfig,
              metrics: [
                {
                  operation: 'count',
                  empty_as_null: true,
                },
              ],
              group_by: [
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['category'],
                },
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['subcategory'],
                },
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['brand'],
                },
              ],
            };

            expect(() => pieConfigSchema.validate(input)).not.toThrow();
          });

          it('allows single metric with multiple collapsed and three non-collapsed breakdowns', () => {
            const input: PieConfigNoESQL = {
              ...basePieConfig,
              metrics: [
                {
                  operation: 'count',
                  empty_as_null: true,
                },
              ],
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
                  fields: ['country'],
                  collapse_by: 'avg',
                },
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['category'],
                },
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['subcategory'],
                },
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['brand'],
                },
              ],
            };

            expect(() => pieConfigSchema.validate(input)).not.toThrow();
          });

          it('throws when single metric has more than three non-collapsed breakdowns', () => {
            const input: PieConfigNoESQL = {
              ...basePieConfig,
              metrics: [
                {
                  operation: 'count',
                  empty_as_null: true,
                },
              ],
              group_by: [
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['category'],
                },
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['subcategory'],
                },
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['brand'],
                },
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['region'],
                },
              ],
            };

            expect(() => pieConfigSchema.validate(input)).toThrow(
              /number of non-collapsed group_by dimensions must not exceed 3/i
            );
          });
        });

        describe('Multiple Metrics Scenarios', () => {
          it('allows multiple metrics without group_by', () => {
            const input: PieConfigNoESQL = {
              ...basePieConfig,
              metrics: [
                {
                  operation: 'count',
                  empty_as_null: true,
                },
                {
                  operation: 'sum',
                  empty_as_null: false,
                  field: 'sales',
                },
              ],
            };

            expect(() => pieConfigSchema.validate(input)).not.toThrow();
          });

          it('allows multiple metrics with single non-collapsed breakdown', () => {
            const input: PieConfigNoESQL = {
              ...basePieConfig,
              metrics: [
                {
                  operation: 'count',
                  empty_as_null: true,
                },
                {
                  operation: 'sum',
                  empty_as_null: false,
                  field: 'sales',
                },
              ],
              group_by: [
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['category'],
                },
              ],
            };

            expect(() => pieConfigSchema.validate(input)).not.toThrow();
          });

          it('allows multiple metrics with two non-collapsed breakdowns', () => {
            const input: PieConfigNoESQL = {
              ...basePieConfig,
              metrics: [
                {
                  operation: 'count',
                  empty_as_null: true,
                },
                {
                  operation: 'sum',
                  empty_as_null: false,
                  field: 'sales',
                },
              ],
              group_by: [
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['category'],
                },
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['subcategory'],
                },
              ],
            };

            expect(() => pieConfigSchema.validate(input)).not.toThrow();
          });

          it('allows multiple metrics with multiple collapsed and two non-collapsed breakdowns', () => {
            const input: PieConfigNoESQL = {
              ...basePieConfig,
              metrics: [
                {
                  operation: 'count',
                  empty_as_null: true,
                },
                {
                  operation: 'sum',
                  empty_as_null: false,
                  field: 'sales',
                },
              ],
              group_by: [
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['region'],
                  collapse_by: 'sum',
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
                  limit: 5,
                  fields: ['category'],
                },
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['subcategory'],
                },
              ],
            };

            expect(() => pieConfigSchema.validate(input)).not.toThrow();
          });

          it('throws when multiple metrics have more than 2 non-collapsed breakdowns', () => {
            const input: PieConfigNoESQL = {
              ...basePieConfig,
              metrics: [
                {
                  operation: 'count',
                  empty_as_null: true,
                },
                {
                  operation: 'sum',
                  empty_as_null: false,
                  field: 'sales',
                },
              ],
              group_by: [
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['category'],
                },
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['subcategory'],
                },
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['brand'],
                },
              ],
            };

            expect(() => pieConfigSchema.validate(input)).toThrow(
              /the number of non-collapsed group_by dimensions must not exceed 2/i
            );
          });

          it('throws when multiple metrics have one collapsed and three non-collapsed breakdowns', () => {
            const input: PieConfigNoESQL = {
              ...basePieConfig,
              metrics: [
                {
                  operation: 'count',
                  empty_as_null: true,
                },
                {
                  operation: 'sum',
                  empty_as_null: false,
                  field: 'sales',
                },
                {
                  operation: 'average',
                  field: 'price',
                },
              ],
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
                  fields: ['subcategory'],
                },
                {
                  operation: 'terms',
                  limit: 5,
                  fields: ['brand'],
                },
              ],
            };

            expect(() => pieConfigSchema.validate(input)).toThrow(
              /the number of non-collapsed group_by dimensions must not exceed 2/i
            );
          });
        });
      });
    });

    describe('ES|QL Schema', () => {
      const baseESQLPieConfig = {
        type: 'pie',
        data_source: {
          type: 'esql',
          query: 'FROM my-index | STATS count() BY category',
        },
        ignore_global_filters: false,
        sampling: 1,
      } satisfies Partial<PieConfigESQL>;
      it('validates minimal ES|QL configuration', () => {
        const input: PieConfigESQL = {
          ...baseESQLPieConfig,
          metrics: [
            {
              column: 'count',
            },
          ],
        };

        const validated = pieConfigSchema.validate(input);
        expect(validated.data_source.type).toBe('esql');
        expect(validated.metrics[0]).toHaveProperty('column', 'count');
      });

      it('validates ES|QL configuration with group_by', () => {
        const input: PieConfigESQL = {
          ...baseESQLPieConfig,
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

        const validated = pieConfigSchema.validate(input);
        expect(validated.group_by).toHaveLength(1);
        expect(validated.group_by?.[0]).toHaveProperty('column', 'category');
      });

      it('validates ES|QL configuration with multiple metrics', () => {
        const input: PieConfigESQL = {
          ...baseESQLPieConfig,
          metrics: [
            {
              column: 'count',
            },
            {
              column: 'sum_sales',
            },
          ],
        };

        const validated = pieConfigSchema.validate(input);
        expect(validated.metrics).toHaveLength(2);
      });

      it('validates ES|QL configuration with full options', () => {
        const input: PieConfigESQL = {
          ...baseESQLPieConfig,
          title: 'Sales Chart',
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
            labels: { position: 'outside' },
            donut_hole: 'l',
          },
        };

        const validated = pieConfigSchema.validate(input);
        expect(validated.title).toBe('Sales Chart');
        expect(validated.styling?.donut_hole).toBe('l');
        expect(validated.styling?.labels?.position).toBe('outside');
      });
    });
  });
});
