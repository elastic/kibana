/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatasetTypeESQL } from '../dataset';
import type { XYState, XYStateESQL } from './xy';
import { statisticsOptionsSize, statisticsSchema, xyStateSchema } from './xy';

describe('XY', () => {
  const minimalLayer = {
    dataset: { type: 'dataView', id: 'myDataView' as const },
    type: 'bar' as const,
    y: [{ operation: 'count' as const }],
  };
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
  const anyType = [...universalTypes, ...typesWithBreakdown] as const;
  describe('minimal xy charts', () => {
    it.each([
      'bar',
      'line',
      'area',
      'bar_stacked',
      'area_stacked',
      'bar_horizontal',
      'bar_horizontal_stacked',
    ] as const)('should pass validation for simple %s', (type) => {
      expect(() =>
        xyStateSchema.validate({
          type: 'xy',
          title: `${type} Chart`,
          layers: [
            {
              dataset: { type: 'dataView', id: 'myDataView' },
              type,
              ignore_global_filters: false,
              sampling: 1,
              y: [{ operation: 'count', empty_as_null: false }],
            },
          ],
        } satisfies XYState)
      ).not.toThrow();
    });

    it.each(anyType)('should pass validation for %s with breakdown', (type) => {
      expect(() =>
        xyStateSchema.validate({
          type: 'xy',
          title: `${type} Chart`,
          layers: [
            {
              dataset: { type: 'dataView', id: 'myDataView' },
              type,
              ignore_global_filters: false,
              sampling: 1,
              y: [{ operation: 'count', empty_as_null: false }],
              breakdown_by: { operation: 'terms', fields: ['product'], limit: 5 },
            },
          ],
        } satisfies XYState)
      ).not.toThrow();
    });

    it.each(anyType)(
      'should pass validation for a date histogram %s with breakdown with multiple terms',
      (type) => {
        expect(() =>
          xyStateSchema.validate({
            type: 'xy',
            title: `${type} Chart`,
            layers: [
              {
                dataset: { type: 'dataView', id: 'myDataView' },
                type,
                ignore_global_filters: false,
                sampling: 1,
                x: {
                  operation: 'date_histogram',
                  field: 'order_date',
                  suggested_interval: 'auto',
                  use_original_time_range: true,
                  include_empty_rows: false,
                },
                y: [{ operation: 'count', empty_as_null: false }],
                breakdown_by: { operation: 'terms', fields: ['product', 'category'], limit: 5 },
              },
            ],
          } satisfies XYState)
        ).not.toThrow();
      }
    );

    it.each(anyType)('should pass validation in ES|QL mode as %s chart', (type) => {
      expect(() =>
        xyStateSchema.validate({
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
        } satisfies XYState)
      ).not.toThrow();
    });

    it.each(anyType)('should support reference lines in %s charts', (type) => {
      expect(() =>
        xyStateSchema.validate({
          type: 'xy',
          title: `${type} Chart`,
          layers: [
            {
              dataset: { type: 'dataView', id: 'myDataView' },
              type,
              ignore_global_filters: false,
              sampling: 1,
              x: {
                operation: 'date_histogram',
                field: 'order_date',
                suggested_interval: 'auto',
                use_original_time_range: true,
                include_empty_rows: false,
              },
              y: [{ operation: 'count', empty_as_null: false }],
              breakdown_by: {
                operation: 'terms',
                fields: ['product', 'category'],
                limit: 5,
              },
            },
            {
              dataset: { type: 'dataView', id: 'myDataView' },
              type: 'referenceLines',
              ignore_global_filters: false,
              sampling: 1,
              thresholds: [
                {
                  operation: 'median',
                  field: 'price',
                  label: 'Median line',
                  color: { type: 'static', color: 'red' },
                  text: { visible: true },
                },
              ],
            },
          ],
        } satisfies XYState)
      ).not.toThrow();
    });

    it.each(anyType)('should support annotations in %s charts', (type) => {
      expect(() =>
        xyStateSchema.validate({
          type: 'xy',
          title: `${type} Chart`,
          layers: [
            {
              dataset: { type: 'dataView', id: 'myDataView' },
              type,
              ignore_global_filters: false,
              sampling: 1,
              x: {
                operation: 'date_histogram',
                field: 'order_date',
                suggested_interval: 'auto',
                use_original_time_range: true,
                include_empty_rows: false,
              },
              y: [{ operation: 'count', empty_as_null: false }],
              breakdown_by: { operation: 'terms', fields: ['product', 'category'], limit: 5 },
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
              ],
            },
          ],
        } satisfies XYState)
      ).not.toThrow();
    });
  });

  describe('full feature xy chart with multiple layers', () => {
    const combinationOfChartTypes = anyType
      .map((type) => anyType.map((anotherType) => [type, anotherType]))
      .flat(1);
    it.each(combinationOfChartTypes)(
      'should handle multiple metric in multiple layers with %s + %s',
      (type1, type2) => {
        expect(() =>
          xyStateSchema.validate({
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
                  suggested_interval: 'auto',
                  use_original_time_range: true,
                  include_empty_rows: false,
                },
                y: [
                  { operation: 'count', empty_as_null: false },
                  { operation: 'average', field: 'price' },
                ],
                breakdown_by: { operation: 'terms', fields: ['product', 'category'], limit: 5 },
              },
              {
                dataset: { type: 'dataView', id: 'companyBIndex' },
                type: type2,
                ignore_global_filters: false,
                sampling: 1,
                x: {
                  operation: 'date_histogram',
                  field: 'order_date',
                  suggested_interval: 'auto',
                  use_original_time_range: true,
                  include_empty_rows: false,
                },
                y: [
                  { operation: 'count', empty_as_null: false },
                  { operation: 'average', field: 'price' },
                ],
                breakdown_by: { operation: 'terms', fields: ['product', 'category'], limit: 5 },
              },
            ],
          } satisfies XYState)
        ).not.toThrow();
      }
    );

    it.each(anyType.map((type) => anyType.map((anotherType) => [type, anotherType])).flat(1))(
      'should handle multiple metric in multiple layers %s + %s with reference lines and annotations',
      (type1, type2) => {
        expect(() =>
          xyStateSchema.validate({
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
                  suggested_interval: 'auto',
                  use_original_time_range: true,
                  include_empty_rows: false,
                },
                y: [
                  { operation: 'count', empty_as_null: false },
                  { operation: 'average', field: 'price' },
                ],
                breakdown_by: { operation: 'terms', fields: ['product', 'category'], limit: 5 },
              },
              {
                dataset: { type: 'dataView', id: 'companyBIndex' },
                type: type2,
                ignore_global_filters: false,
                sampling: 1,
                x: {
                  operation: 'date_histogram',
                  field: 'order_date',
                  suggested_interval: 'auto',
                  use_original_time_range: true,
                  include_empty_rows: false,
                },
                y: [
                  { operation: 'count', empty_as_null: false },
                  { operation: 'average', field: 'price' },
                ],
                breakdown_by: { operation: 'terms', fields: ['product', 'category'], limit: 5 },
              },
              {
                dataset: { type: 'dataView', id: 'myDataView' },
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
                  },
                  {
                    operation: 'average',
                    field: 'price',
                    label: 'Average Price',
                    color: { type: 'static', color: 'blue' },
                    text: { visible: true },
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
                    query: { language: 'kuery', query: 'order_amount > 1000' },
                    time_field: 'order_date',
                    text: { visible: true },
                    color: {
                      type: 'static',
                      color: '#0000ff',
                    },
                  },
                ],
              },
            ],
          } satisfies XYState)
        ).not.toThrow();
      }
    );

    it.each(anyType.map((type) => anyType.map((anotherType) => [type, anotherType])).flat(1))(
      'should handle multiple metric in multiple layers %s + %s with reference lines and annotations with mixed datasets',
      (type1, type2) => {
        expect(() =>
          xyStateSchema.validate({
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
                    query: { language: 'kuery', query: 'order_amount > 1000' },
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
          } satisfies XYState)
        ).not.toThrow();
      }
    );
  });

  describe('invalid xy charts', () => {
    it('should throw for no layers', () => {
      expect(() =>
        xyStateSchema.validate({
          type: 'xy',
          title: `Faulty Chart`,
          layers: [],
        } satisfies XYState)
      ).toThrow();
    });

    it('should not let mix esql dataset with dsl operations', () => {
      expect(() =>
        xyStateSchema.validate({
          type: 'xy',
          title: `Faulty Chart`,
          layers: [
            // @ts-expect-error - mixing not allowed
            {
              dataset: { type: 'esql', query: 'FROM company_index' },
              type: 'bar',
              ignore_global_filters: false,
              sampling: 1,
              x: {
                operation: 'date_histogram',
                field: 'order_date',
                suggested_interval: 'auto',
                use_original_time_range: true,
                include_empty_rows: false,
              },
              y: [
                { operation: 'count', empty_as_null: false },
                { operation: 'average', field: 'price' },
              ],
              breakdown_by: { operation: 'terms', fields: ['product', 'category'], limit: 5 },
            },
          ],
        } satisfies XYState)
      ).toThrow();
    });

    it('should not let esql annotations', () => {
      expect(() =>
        xyStateSchema.validate({
          type: 'xy',
          title: `Faulty Chart`,
          layers: [
            {
              dataset: { type: 'dataView', id: 'myDataView' },
              type: 'bar',
              ignore_global_filters: false,
              sampling: 1,
              x: {
                operation: 'date_histogram',
                field: 'order_date',
                suggested_interval: 'auto',
                use_original_time_range: true,
                include_empty_rows: false,
              },
              y: [{ operation: 'count', empty_as_null: false }],
            },
            {
              type: 'annotations',
              ignore_global_filters: false,
              // @ts-expect-error - mixing not allowed
              dataset: {
                type: 'esql',
                query:
                  'FROM kibana_simple_logs_data | EVAL timestamp = order_date | FILTER product == "xyz" ',
              } satisfies DatasetTypeESQL,
              events: [
                {
                  type: 'point',
                  label: 'Event',
                  timestamp: '2023-01-01T00:00:00Z',
                  text: { visible: true },
                  color: {
                    type: 'static',
                    color: '#ff0000',
                  },
                },
              ],
            },
          ],
        } satisfies XYState | XYStateESQL)
      ).toThrow();
    });

    it('should reject list legend layout for left positions', () => {
      expect(() =>
        xyStateSchema.validate({
          type: 'xy',
          title: 'Invalid list legend position',
          legend: {
            visibility: 'visible',
            position: 'left',
            layout: {
              type: 'list',
              truncate: {
                max_pixels: 300,
              },
            },
          },
          layers: [minimalLayer],
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        "[legend]: types that failed validation:
        - [legend.0.position]: types that failed validation:
         - [legend.position.0]: expected value to equal [top]
         - [legend.position.1]: expected value to equal [bottom]
        - [legend.1.layout.type]: expected value to equal [grid]
        - [legend.2.placement]: expected value to equal [inside]"
      `);
    });

    it('should not allow both truncation values at the same time', () => {
      expect(() =>
        xyStateSchema.validate({
          type: 'xy',
          title: 'Valid list legend truncation',
          legend: {
            visibility: 'visible',
            position: 'bottom',
            layout: {
              type: 'list',
              truncate: {
                max_lines: 2,
                max_pixels: 320,
              },
            },
          },
          layers: [minimalLayer],
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        "[legend]: types that failed validation:
        - [legend.0.layout]: types that failed validation:
         - [legend.layout.0.type]: expected value to equal [grid]
         - [legend.layout.1.truncate.max_lines]: Additional properties are not allowed ('max_lines' was unexpected)
        - [legend.1.layout.type]: expected value to equal [grid]
        - [legend.2.placement]: expected value to equal [inside]"
      `);
    });
  });

  describe('legend layout schema', () => {
    it('should allow list legend layout for top/bottom with truncate.max_pixels', () => {
      expect(() =>
        xyStateSchema.validate({
          type: 'xy',
          title: 'Valid list legend',
          legend: {
            visibility: 'visible',
            position: 'bottom',
            layout: {
              type: 'list',
              truncate: {
                max_pixels: 320,
              },
            },
          },
          layers: [minimalLayer],
        })
      ).not.toThrow();
    });
  });

  it('should track number of statistics options', () => {
    const realStatisticsOptionsSize = (statisticsSchema.getSchema() as any)?.$_root?._types?.size;

    expect(statisticsOptionsSize).toBe(realStatisticsOptionsSize);
  });
});
