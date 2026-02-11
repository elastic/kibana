/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYState as XYLensState } from '@kbn/lens-common';
import { xyStateSchema } from '../../schema/charts/xy';
import type { LensAttributes } from '../../types';
import { validateAPIConverter, validateConverter } from '../validate';
import {
  barWithTwoLayersAttributes,
  breakdownXY,
  fullBasicXY,
  minimalAttributesXY,
  mixedChartAttributes,
  multipleMetricsXY,
  xyWithFormulaRefColumnsAndRankByTermsBucketOperationAttributes,
} from './basicXY.mock';
import { dualReferenceLineXY, referenceLineXY } from './referenceLines.mock';
import { annotationXY } from './annotations.mock';
import { esqlChart } from './esqlXY.mock';

function setSeriesType(attributes: LensAttributes, seriesType: 'bar' | 'line' | 'area') {
  return {
    ...attributes,
    state: {
      ...attributes.state,
      visualization: {
        ...(attributes.state.visualization as XYLensState),
        layers: (attributes.state.visualization as XYLensState).layers.map((layer) => {
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
    });

    describe('ES|QL panels', () => {
      for (const type of ['bar', 'line', 'area'] as const) {
        it(`should work for an annotation with a ${type} chart`, () => {
          validateConverter(setSeriesType(esqlChart, type), xyStateSchema);
        });
      }
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
              x: { operation: 'value', column: 'order_date' },
              y: [{ operation: 'value', column: 'count' }],
              breakdown_by: { operation: 'value', column: 'product' },
            },
          ],
        },
        xyStateSchema
      );
    });

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
                  size: 5,
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
                x: { operation: 'value', column: 'order_date' },
                y: [
                  { operation: 'value', column: 'value' },
                  { operation: 'value', column: 'price' },
                ],
                breakdown_by: { operation: 'value', column: 'product' },
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
                    text: 'label',
                    axis: 'left',
                  },
                  {
                    operation: 'average',
                    field: 'price',
                    label: 'Average Price',
                    color: { type: 'static', color: 'blue' },
                    text: 'none',
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
                    text: 'label',
                    color: {
                      type: 'static',
                      color: '#ff0000',
                    },
                  },
                  {
                    type: 'point',
                    label: 'Christmas',
                    timestamp: '2023-12-25T00:00:00Z',
                    text: 'label',
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
                    query: { language: 'kuery', query: 'order_amount > 1000' },
                    time_field: 'order_date',
                    text: { type: 'field', field: 'order_id' },
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
  });
});
