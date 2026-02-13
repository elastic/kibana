/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PieStateNoESQL, PieState, PieStateESQL } from './pie';
import { pieStateSchema } from './pie';

describe('Pie/Donut Schema', () => {
  describe.each(['pie', 'donut'] as const)('%s chart type', (chartType) => {
    const basePieConfig: Pick<
      PieStateNoESQL,
      'type' | 'dataset' | 'ignore_global_filters' | 'sampling'
    > = {
      type: chartType,
      dataset: {
        type: 'dataView',
        id: 'test-data-view',
      },
      ignore_global_filters: false,
      sampling: 1,
    };

    describe('Non-ES|QL Schema', () => {
      it('validates minimal configuration with single metric', () => {
        const input: PieState = {
          ...basePieConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
        };

        const validated = pieStateSchema.validate(input);
        expect(validated.type).toBe(chartType);
        expect(validated.metrics).toHaveLength(1);
        expect(validated.metrics[0].operation).toBe('count');
      });

      it('validates configuration with metrics and group_by', () => {
        const input: PieState = {
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
              size: 5,
              fields: ['category'],
            },
          ],
        };

        const validated = pieStateSchema.validate(input);
        expect(validated.metrics).toHaveLength(1);
        expect(validated.group_by).toHaveLength(1);
      });

      it('validates configuration with donut_hole', () => {
        const input: PieState = {
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
              size: 5,
              fields: ['category'],
            },
          ],
          donut_hole: 'medium',
        };

        const validated = pieStateSchema.validate(input);
        expect(validated.donut_hole).toBe('medium');
      });

      it('validates full configuration with specific options', () => {
        const input: PieState = {
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
              size: 5,
              fields: ['category'],
            },
          ],
          legend: {
            nested: false,
            truncate_after_lines: 2,
            visible: 'show',
            size: 'xlarge',
          },
          label_position: 'inside',
          donut_hole: 'small',
          value_display: {
            mode: 'percentage',
            percent_decimals: 0,
          },
        };

        const validated = pieStateSchema.validate(input);
        expect(validated.title).toBe('Sales Chart');
        expect(validated.legend?.nested).toBe(false);
        expect(validated.label_position).toBe('inside');
        expect(validated.donut_hole).toBe('small');
        expect(validated.value_display?.mode).toBe('percentage');
      });

      it('validates configuration with multiple group_by dimensions', () => {
        const input: PieState = {
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
              size: 5,
              fields: ['category'],
            },
            {
              operation: 'terms',
              size: 5,
              fields: ['subcategory'],
            },
            {
              operation: 'terms',
              size: 5,
              fields: ['brand'],
            },
          ],
        };

        const validated = pieStateSchema.validate(input);
        expect(validated.group_by).toHaveLength(3);
      });

      it('validates configuration with color mapping', () => {
        const input: PieState = {
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
              size: 5,
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

        const validated = pieStateSchema.validate(input);
        expect(validated.group_by?.[0].color).toHaveProperty('mode', 'categorical');
      });

      it('validates configuration with collapsed dimensions', () => {
        const input: PieState = {
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
        };

        const validated = pieStateSchema.validate(input);
        expect(validated.group_by).toHaveLength(2);
        expect(validated.group_by?.[0].collapse_by).toBe('sum');
      });

      it('throws on empty metrics array', () => {
        const input: PieState = {
          ...basePieConfig,
          metrics: [],
        };

        expect(() => pieStateSchema.validate(input)).toThrow();
      });

      it('throws on empty group_by array', () => {
        const input: PieState = {
          ...basePieConfig,
          metrics: [
            {
              operation: 'count',
              empty_as_null: true,
            },
          ],
          group_by: [],
        };

        expect(() => pieStateSchema.validate(input)).toThrow();
      });

      it('throws on invalid donut hole size', () => {
        const input: Omit<PieState, 'donut_hole'> & { donut_hole: string } = {
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
              size: 5,
              fields: ['category'],
            },
          ],
          donut_hole: 'invalid',
        };

        expect(() => pieStateSchema.validate(input)).toThrow();
      });

      it('throws on invalid label position', () => {
        const input: Omit<PieState, 'label_position'> & { label_position: string } = {
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
              size: 5,
              fields: ['category'],
            },
          ],
          label_position: 'invalid',
        };

        expect(() => pieStateSchema.validate(input)).toThrow();
      });

      describe('Grouping Validation', () => {
        describe('Single Metric Scenarios', () => {
          it('allows single metric with single non-collapsed breakdown', () => {
            const input: PieState = {
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
                  size: 5,
                  fields: ['category'],
                },
              ],
            };

            expect(() => pieStateSchema.validate(input)).not.toThrow();
          });

          it('allows single metric with two non-collapsed breakdowns', () => {
            const input: PieState = {
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
                  size: 5,
                  fields: ['category'],
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['subcategory'],
                },
              ],
            };

            expect(() => pieStateSchema.validate(input)).not.toThrow();
          });

          it('allows single metric with three non-collapsed breakdowns', () => {
            const input: PieState = {
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
                  size: 5,
                  fields: ['category'],
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['subcategory'],
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['brand'],
                },
              ],
            };

            expect(() => pieStateSchema.validate(input)).not.toThrow();
          });

          it('allows single metric with multiple collapsed and three non-collapsed breakdowns', () => {
            const input: PieState = {
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
                  size: 5,
                  fields: ['region'],
                  collapse_by: 'sum',
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['country'],
                  collapse_by: 'avg',
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['category'],
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['subcategory'],
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['brand'],
                },
              ],
            };

            expect(() => pieStateSchema.validate(input)).not.toThrow();
          });

          it('throws when single metric has more than three non-collapsed breakdowns', () => {
            const input: PieState = {
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
                  size: 5,
                  fields: ['category'],
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['subcategory'],
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['brand'],
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['region'],
                },
              ],
            };

            expect(() => pieStateSchema.validate(input)).toThrow(
              /number of non-collapsed group_by dimensions must not exceed 3/i
            );
          });
        });

        describe('Multiple Metrics Scenarios', () => {
          it('allows multiple metrics without group_by', () => {
            const input: PieState = {
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

            expect(() => pieStateSchema.validate(input)).not.toThrow();
          });

          it('allows multiple metrics with single non-collapsed breakdown', () => {
            const input: PieState = {
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
                  size: 5,
                  fields: ['category'],
                },
              ],
            };

            expect(() => pieStateSchema.validate(input)).not.toThrow();
          });

          it('allows multiple metrics with two non-collapsed breakdowns', () => {
            const input: PieState = {
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
                  size: 5,
                  fields: ['category'],
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['subcategory'],
                },
              ],
            };

            expect(() => pieStateSchema.validate(input)).not.toThrow();
          });

          it('allows multiple metrics with multiple collapsed and two non-collapsed breakdowns', () => {
            const input: PieState = {
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
                  size: 5,
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
                  size: 5,
                  fields: ['category'],
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['subcategory'],
                },
              ],
            };

            expect(() => pieStateSchema.validate(input)).not.toThrow();
          });

          it('throws when multiple metrics have more than 2 non-collapsed breakdowns', () => {
            const input: PieState = {
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
                  size: 5,
                  fields: ['category'],
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['subcategory'],
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['brand'],
                },
              ],
            };

            expect(() => pieStateSchema.validate(input)).toThrow(
              /the number of non-collapsed group_by dimensions must not exceed 2/i
            );
          });

          it('throws when multiple metrics have one collapsed and three non-collapsed breakdowns', () => {
            const input: PieState = {
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
                  fields: ['subcategory'],
                },
                {
                  operation: 'terms',
                  size: 5,
                  fields: ['brand'],
                },
              ],
            };

            expect(() => pieStateSchema.validate(input)).toThrow(
              /the number of non-collapsed group_by dimensions must not exceed 2/i
            );
          });
        });
      });
    });

    describe('ES|QL Schema', () => {
      const baseESQLPieConfig: Pick<
        PieStateESQL,
        'type' | 'dataset' | 'ignore_global_filters' | 'sampling'
      > = {
        type: chartType,
        dataset: {
          type: 'esql',
          query: 'FROM my-index | STATS count() BY category',
        },
        ignore_global_filters: false,
        sampling: 1,
      };
      it('validates minimal ES|QL configuration', () => {
        const input: PieState = {
          ...baseESQLPieConfig,
          metrics: [
            {
              operation: 'value',
              column: 'count',
            },
          ],
        };

        const validated = pieStateSchema.validate(input);
        expect(validated.dataset.type).toBe('esql');
        expect(validated.metrics[0].operation).toBe('value');
      });

      it('validates ES|QL configuration with group_by', () => {
        const input: PieState = {
          ...baseESQLPieConfig,
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

        const validated = pieStateSchema.validate(input);
        expect(validated.group_by).toHaveLength(1);
        expect(validated.group_by?.[0]).toHaveProperty('column', 'category');
      });

      it('validates ES|QL configuration with multiple metrics', () => {
        const input: PieState = {
          ...baseESQLPieConfig,
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

        const validated = pieStateSchema.validate(input);
        expect(validated.metrics).toHaveLength(2);
      });

      it('validates ES|QL configuration with full options', () => {
        const input: PieState = {
          ...baseESQLPieConfig,
          title: 'Sales Chart',
          metrics: [
            {
              operation: 'value',
              column: 'sum_sales',
              color: {
                type: 'static',
                color: '#0000FF',
              },
            },
          ],
          group_by: [
            {
              operation: 'value',
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
            visible: 'show',
          },
          label_position: 'outside',
          donut_hole: 'large',
        };

        const validated = pieStateSchema.validate(input);
        expect(validated.title).toBe('Sales Chart');
        expect(validated.label_position).toBe('outside');
        expect(validated.donut_hole).toBe('large');
      });
    });
  });
});
