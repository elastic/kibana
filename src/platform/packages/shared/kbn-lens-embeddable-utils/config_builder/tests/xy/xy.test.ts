/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYVisualizationState } from '@kbn/lens-common';
import { xyStateSchema } from '../../schema/charts/xy';
import type { LensAttributes } from '../../types';
import { validateAPIConverter, validateConverter } from '../validate';
import {
  apiXYWithNoTitleAndCustomOutsideLegend,
  apiXYWithNoYTitleAndInsideLegend,
  apiXYWithTopListWithTruncationLegend,
  barWithTwoLayersAttributes,
  breakdownXY,
  fullBasicXY,
  minimalAttributesXY,
  mixedChartAttributes,
  multipleMetricsXY,
  xyWithFormulaRefColumnsAndRankByTermsBucketOperationAttributes,
} from './basicXY.mock';
import { dualReferenceLineXY, referenceLineXY } from './referenceLines.mock';
import { annotationXY, byRefAnnotationXY } from './annotations.mock';
import {
  esqlChart,
  esqlChartWithBreakdownColorMapping,
  esqlXYWithCollapseByBreakdown,
} from './esqlXY.mock';

function setSeriesType(attributes: LensAttributes, seriesType: 'bar' | 'line' | 'area') {
  return {
    ...attributes,
    state: {
      ...attributes.state,
      visualization: {
        ...(attributes.state.visualization as XYVisualizationState),
        layers: (attributes.state.visualization as XYVisualizationState).layers.map((layer) => {
          if (!layer.layerType || layer.layerType === 'data') {
            return {
              ...layer,
              seriesType,
            };
          }
          return layer;
        }),
      },
    },
  };
}

describe('XY', () => {
  describe('Lens State SO => API format', () => {
    describe('Data only', () => {
      for (const type of ['bar', 'line', 'area'] as const) {
        it(`should convert a minimal ${type} chart with one data layer`, () => {
          validateConverter(setSeriesType(minimalAttributesXY, type), xyStateSchema);
        });
      }

      it(`should convert a full xy chart with one data layer`, () => {
        validateConverter(fullBasicXY, xyStateSchema);
      });

      it(`should convert a xy chart with multiple metrics`, () => {
        validateConverter(multipleMetricsXY, xyStateSchema);
      });

      it(`should convert a xy chart with multiple metrics and a breakdown`, () => {
        validateConverter(breakdownXY, xyStateSchema);
      });

      it('should convert a bar chart with 2 layers', () => {
        validateConverter(barWithTwoLayersAttributes, xyStateSchema);
      });

      it('should convert a mixed chart with 3 layers', () => {
        validateConverter(mixedChartAttributes, xyStateSchema);
      });

      it('should convert a chart with formula ref columns and rank_by in the terms bucket operation', () => {
        validateConverter(
          xyWithFormulaRefColumnsAndRankByTermsBucketOperationAttributes,
          xyStateSchema
        );
      });

      it('should convert an esql xy with collapse by breakdown', () => {
        validateConverter(esqlXYWithCollapseByBreakdown, xyStateSchema);
      });
    });

    describe('Reference lines', () => {
      for (const type of ['bar', 'line', 'area'] as const) {
        it(`should work for a reference line with a ${type} chart`, () => {
          validateConverter(setSeriesType(referenceLineXY, type), xyStateSchema);
        });
      }

      it('should work for both horizontal and vertical reference lines', () => {
        validateConverter(dualReferenceLineXY, xyStateSchema);
      });
    });

    describe('Annotations', () => {
      for (const type of ['bar', 'line', 'area'] as const) {
        it(`should work for an annotation with a ${type} chart`, () => {
          validateConverter(setSeriesType(annotationXY, type), xyStateSchema);
        });
      }

      for (const type of ['bar', 'line', 'area'] as const) {
        it(`should work for a by-reference annotation with a ${type} chart`, () => {
          validateConverter(setSeriesType(byRefAnnotationXY, type), xyStateSchema);
        });
      }
    });

    describe('ES|QL panels', () => {
      for (const type of ['bar', 'line', 'area'] as const) {
        it(`should work for an annotation with a ${type} chart`, () => {
          validateConverter(setSeriesType(esqlChart, type), xyStateSchema);
        });
      }

      for (const type of ['bar', 'line', 'area'] as const) {
        it(`should work for an ES|QL ${type} chart with breakdown and color mapping`, () => {
          validateConverter(setSeriesType(esqlChartWithBreakdownColorMapping, type), xyStateSchema);
        });
      }

      describe('X-axis scale detection', () => {
        it('should detect temporal scale for ES|QL chart with date column', () => {
          const esqlChartWithDateColumn: LensAttributes = {
            title: 'ES|QL Chart with Date X-Axis',
            references: [],
            visualizationType: 'lnsXY',
            state: {
              datasourceStates: {
                textBased: {
                  layers: {
                    layer1: {
                      index: 'test-index',
                      query: {
                        esql: 'FROM logs | STATS count = COUNT(*) BY timestamp',
                      },
                      columns: [
                        {
                          columnId: 'timestamp',
                          fieldName: 'timestamp',
                          meta: {
                            type: 'date',
                            esType: 'date',
                          },
                        },
                        {
                          columnId: 'count',
                          fieldName: 'count',
                          meta: {
                            type: 'number',
                            esType: 'long',
                          },
                          inMetricDimension: true,
                        },
                      ],
                    },
                  },
                },
              },
              visualization: {
                legend: { isVisible: true, position: 'right' },
                preferredSeriesType: 'bar',
                layers: [
                  {
                    layerId: 'layer1',
                    seriesType: 'bar',
                    xAccessor: 'timestamp',
                    accessors: ['count'],
                    layerType: 'data',
                  },
                ],
              },
              query: { esql: 'FROM logs | STATS count = COUNT(*) BY timestamp' },
              filters: [],
            },
          };

          validateConverter(esqlChartWithDateColumn, xyStateSchema);
        });

        it('should detect linear scale for ES|QL chart with numeric column', () => {
          const esqlChartWithNumericColumn: LensAttributes = {
            title: 'ES|QL Chart with Numeric X-Axis',
            references: [],
            visualizationType: 'lnsXY',
            state: {
              datasourceStates: {
                textBased: {
                  layers: {
                    layer1: {
                      index: 'test-index',
                      query: {
                        esql: 'FROM logs | STATS count = COUNT(*) BY bytes',
                      },
                      columns: [
                        {
                          columnId: 'bytes',
                          fieldName: 'bytes',
                          meta: {
                            type: 'number',
                            esType: 'long',
                          },
                        },
                        {
                          columnId: 'count',
                          fieldName: 'count',
                          meta: {
                            type: 'number',
                            esType: 'long',
                          },
                          inMetricDimension: true,
                        },
                      ],
                    },
                  },
                },
              },
              visualization: {
                legend: { isVisible: true, position: 'right' },
                preferredSeriesType: 'line',
                layers: [
                  {
                    layerId: 'layer1',
                    seriesType: 'line',
                    xAccessor: 'bytes',
                    accessors: ['count'],
                    layerType: 'data',
                  },
                ],
              },
              query: { esql: 'FROM logs | STATS count = COUNT(*) BY bytes' },
              filters: [],
            },
          };

          validateConverter(esqlChartWithNumericColumn, xyStateSchema);
        });

        it('should default to ordinal scale for form-based chart', () => {
          validateConverter(minimalAttributesXY, xyStateSchema);
        });
      });
    });
  });
  describe('API => Lens State SO format', () => {
    const universalTypes = [
      'bar',
      'line',
      'area',
      'bar_stacked',
      'area_stacked',
      'bar_horizontal',
      'bar_horizontal_stacked',
    ] as const;

    const typesWithBreakdown = [
      'bar_percentage',
      'area_percentage',
      'bar_horizontal_percentage',
    ] as const;
    const anyType = [...universalTypes, ...typesWithBreakdown];
    it.each(universalTypes)('should work for for a minimal %s', (type) => {
      validateAPIConverter(
        {
          type: 'xy',
          title: `${type} Chart`,
          layers: [
            {
              ignore_global_filters: false,
              sampling: 1,
              dataset: { type: 'dataView', id: 'myDataView' },
              type,
              y: [{ operation: 'count', empty_as_null: false }],
            },
          ],
        },
        xyStateSchema
      );
    });

    it.each(anyType)('should work for ES|QL mode for a minimal %s chart with breakdown', (type) => {
      validateAPIConverter(
        {
          type: 'xy',
          title: `${type} Chart`,
          layers: [
            {
              dataset: {
                type: 'esql',
                query:
                  'FROM kibana_simple_logs_data | STATS count = count() BY buckets = BUCKET(3 hours, order_date), product',
              },
              type,
              ignore_global_filters: false,
              sampling: 1,
              x: { column: 'order_date' },
              y: [{ column: 'count' }],
              breakdown_by: { column: 'product' },
            },
          ],
        },
        xyStateSchema
      );
    });

    it.each(anyType)(
      'should work for ES|QL mode for a %s chart with breakdown and collapse_by',
      (type) => {
        validateAPIConverter(
          {
            type: 'xy',
            title: `${type} Chart with collapse`,
            layers: [
              {
                dataset: {
                  type: 'esql',
                  query: 'FROM kibana_sample_data_logs',
                },
                type,
                ignore_global_filters: false,
                sampling: 1,
                x: { column: '@timestamp' },
                y: [{ column: 'bytes' }],
                breakdown_by: { column: 'agent', collapse_by: 'max' },
              },
            ],
          },
          xyStateSchema
        );
      }
    );

    it.each(anyType)(
      'should work for ES|QL mode for %s chart with breakdown and categorical color mapping',
      (type) => {
        validateAPIConverter(
          {
            type: 'xy',
            title: `${type} Chart with Color Mapping`,
            layers: [
              {
                dataset: {
                  type: 'esql',
                  query:
                    'FROM kibana_sample_data | STATS count = count() BY category, buckets = BUCKET(3 hours, order_date)',
                },
                type,
                ignore_global_filters: false,
                sampling: 1,
                x: { column: 'buckets' },
                y: [{ column: 'count' }],
                breakdown_by: {
                  column: 'category',
                  color: {
                    mode: 'categorical',
                    palette: 'default',
                    mapping: [
                      {
                        values: ['Clothing'],
                        color: { type: 'color_code', value: '#ff0000' },
                      },
                    ],
                  },
                },
              },
            ],
          },
          xyStateSchema
        );
      }
    );
    it.each(anyType.map((type) => anyType.map((anotherType) => [type, anotherType])).flat(1))(
      'should handle multiple metric in multiple layers %s + %s with reference lines and annotations with mixed datasets',
      (type1, type2) => {
        validateAPIConverter(
          {
            type: 'xy',
            title: `Mixed Chart`,
            layers: [
              {
                dataset: { type: 'dataView', id: 'companyAIndex' },
                type: type1,
                ignore_global_filters: false,
                sampling: 1,
                x: {
                  operation: 'date_histogram',
                  field: 'order_date',
                  include_empty_rows: false,
                  suggested_interval: 'auto',
                  use_original_time_range: true,
                  drop_partial_intervals: false,
                },
                y: [
                  { operation: 'count', empty_as_null: false },
                  { operation: 'average', field: 'price' },
                ],
                breakdown_by: {
                  operation: 'terms',
                  fields: ['product', 'category'],
                  limit: 5,
                  rank_by: {
                    direction: 'desc',
                    metric: 0,
                    type: 'column',
                  },
                },
              },
              {
                dataset: { type: 'esql', query: 'FROM company_index' },
                type: type2,
                ignore_global_filters: false,
                sampling: 1,
                x: { column: 'order_date' },
                y: [{ column: 'value' }, { column: 'price' }],
                breakdown_by: { column: 'product' },
              },
              {
                dataset: { type: 'index', index: 'companyIndex', time_field: '@timestamp' },
                type: 'referenceLines',
                ignore_global_filters: false,
                sampling: 1,
                thresholds: [
                  {
                    operation: 'median',
                    field: 'price',
                    label: 'Median Price',
                    color: { type: 'static', color: 'red' },
                    text: { visible: true },
                    axis: 'left',
                  },
                  {
                    operation: 'average',
                    field: 'price',
                    label: 'Average Price',
                    color: { type: 'static', color: 'blue' },
                    text: { visible: false },
                    axis: 'left',
                  },
                ],
              },
              {
                type: 'annotations',
                ignore_global_filters: false,
                dataset: {
                  type: 'dataView',
                  id: 'metrics-*',
                },
                events: [
                  {
                    type: 'point',
                    label: 'New Year',
                    timestamp: '2023-01-01T00:00:00Z',
                    text: { visible: true },
                    color: {
                      type: 'static',
                      color: '#ff0000',
                    },
                  },
                  {
                    type: 'point',
                    label: 'Christmas',
                    timestamp: '2023-12-25T00:00:00Z',
                    text: { visible: true },
                    color: {
                      type: 'static',
                      color: '#ff0000',
                    },
                  },
                  {
                    type: 'range',
                    label: 'Promotion',
                    interval: {
                      from: '2023-12-20T00:00:00Z',
                      to: '2023-12-27T23:59:59Z',
                    },
                    fill: 'outside',
                    color: {
                      type: 'static',
                      color: '#00ff00',
                    },
                  },
                  {
                    type: 'query',
                    label: 'Bingo!',
                    query: { language: 'kql', expression: 'order_amount > 1000' },
                    time_field: 'order_date',
                    text: {
                      visible: true,
                      field: 'order_id',
                    },
                    color: {
                      type: 'static',
                      color: '#0000ff',
                    },
                  },
                ],
              },
            ],
          },
          xyStateSchema
        );
      }
    );

    it('should correctly transform no title and inside legend - bug 248611', () => {
      validateAPIConverter(apiXYWithNoYTitleAndInsideLegend, xyStateSchema);
    });

    it('should correctly transform top list layout with pixel truncation', () => {
      validateAPIConverter(apiXYWithTopListWithTruncationLegend, xyStateSchema);
    });

    it('should correctly transform with custom position legend - bug 248611', () => {
      validateAPIConverter(apiXYWithNoTitleAndCustomOutsideLegend, xyStateSchema);
    });

    it('should convert API with by-reference annotation layer', () => {
      validateAPIConverter(
        {
          type: 'xy',
          title: 'Chart with by-ref annotation',
          layers: [
            {
              dataset: { type: 'dataView', id: 'myDataView' },
              type: 'line',
              ignore_global_filters: false,
              sampling: 1,
              y: [{ operation: 'count', empty_as_null: false }],
            },
            {
              type: 'annotation_group',
              group_id: 'my-library-annotation-group',
            },
          ],
        },
        xyStateSchema
      );
    });

    describe('XY axis scale support (text-based)', () => {
      it('should convert temporal scale correctly for ES|QL layer', () => {
        validateAPIConverter(
          {
            type: 'xy',
            title: 'XY Chart with Temporal Scale',
            axis: {
              x: {
                scale: 'temporal',
              },
            },
            layers: [
              {
                ignore_global_filters: false,
                sampling: 1,
                dataset: {
                  type: 'esql',
                  query:
                    'FROM kibana_sample_data_logs | STATS count = count() BY buckets = BUCKET(@timestamp, 1 hour)',
                },
                type: 'bar',
                x: { column: 'buckets' },
                y: [{ column: 'count' }],
              },
            ],
          },
          xyStateSchema
        );
      });

      it('should convert linear scale correctly for ES|QL layer', () => {
        validateAPIConverter(
          {
            type: 'xy',
            title: 'XY Chart with Linear Scale',
            axis: {
              x: {
                scale: 'linear',
              },
            },
            layers: [
              {
                ignore_global_filters: false,
                sampling: 1,
                dataset: {
                  type: 'esql',
                  query: 'FROM kibana_sample_data_logs | STATS count = count() BY bytes',
                },
                type: 'line',
                x: { column: 'bytes' },
                y: [{ column: 'count' }],
              },
            ],
          },
          xyStateSchema
        );
      });

      it('should handle config without axis object', () => {
        validateAPIConverter(
          {
            type: 'xy',
            title: 'XY Chart without Axis',
            layers: [
              {
                ignore_global_filters: false,
                sampling: 1,
                dataset: {
                  type: 'esql',
                  query: 'FROM kibana_sample_data_logs | STATS count = count() BY bytes',
                },
                type: 'bar',
                y: [{ column: 'count' }],
              },
            ],
          },
          xyStateSchema
        );
      });

      it('should handle config with axis but no x axis', () => {
        validateAPIConverter(
          {
            type: 'xy',
            title: 'XY Chart with Y-Axis Only',
            axis: {
              left: {
                ticks: { visible: true },
                grid: { visible: true },
              },
            },
            layers: [
              {
                ignore_global_filters: false,
                sampling: 1,
                dataset: {
                  type: 'esql',
                  query: 'FROM kibana_sample_data_logs | STATS count = count() BY bytes',
                },
                type: 'bar',
                y: [{ column: 'count' }],
              },
            ],
          },
          xyStateSchema
        );
      });
    });
  });
});
