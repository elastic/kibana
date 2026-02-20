/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { statisticsOptionsSize, statisticsSchema, xyStateSchema } from './xy';

describe('XY', () => {
  const universalTypes = [
    'bar',
    'line',
    'area',
    'bar_stacked',
    'area_stacked',
    'bar_horizontal',
    'bar_horizontal_stacked',
  ];

  const typesWithBreakdown = ['bar_percentage', 'area_percentage', 'bar_horizontal_percentage'];
  const anyType = universalTypes.concat(typesWithBreakdown);
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
            { dataset: { type: 'dataView', id: 'myDataView' }, type, y: [{ operation: 'count' }] },
          ],
        })
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
              y: [{ operation: 'count' }],
              breakdown_by: { operation: 'terms', fields: ['product'] },
            },
          ],
        })
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
                x: { operation: 'date_histogram', field: 'order_date' },
                y: [{ operation: 'count' }],
                breakdown_by: { operation: 'terms', fields: ['product', 'category'] },
              },
            ],
          })
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
              x: { operation: 'value', column: 'order_date' },
              y: [{ operation: 'value', column: 'count' }],
              breakdown_by: { operation: 'value', column: 'product' },
            },
          ],
        })
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
              x: { operation: 'date_histogram', field: 'order_date' },
              y: [{ operation: 'count' }],
              breakdown_by: { operation: 'terms', fields: ['product', 'category'] },
            },
            {
              dataset: { type: 'dataView', id: 'myDataView' },
              type: 'referenceLines',
              thresholds: [
                {
                  operation: 'median',
                  field: 'price',
                  label: 'Median line',
                  color: { type: 'static', color: 'red' },
                  text: 'label',
                },
              ],
            },
          ],
        })
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
              x: { operation: 'date_histogram', field: 'order_date' },
              y: [{ operation: 'count' }],
              breakdown_by: { operation: 'terms', fields: ['product', 'category'] },
            },
            {
              type: 'annotations',
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
              ],
            },
          ],
        })
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
                x: { operation: 'date_histogram', field: 'order_date' },
                y: [{ operation: 'count' }, { operation: 'average', field: 'price' }],
                breakdown_by: { operation: 'terms', fields: ['product', 'category'] },
              },
              {
                dataset: { type: 'dataView', id: 'companyBIndex' },
                type: type2,
                x: { operation: 'date_histogram', field: 'order_date' },
                y: [{ operation: 'count' }, { operation: 'average', field: 'price' }],
                breakdown_by: { operation: 'terms', fields: ['product', 'category'] },
              },
            ],
          })
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
                x: { operation: 'date_histogram', field: 'order_date' },
                y: [{ operation: 'count' }, { operation: 'average', field: 'price' }],
                breakdown_by: { operation: 'terms', fields: ['product', 'category'] },
              },
              {
                dataset: { type: 'dataView', id: 'companyBIndex' },
                type: type2,
                x: { operation: 'date_histogram', field: 'order_date' },
                y: [{ operation: 'count' }, { operation: 'average', field: 'price' }],
                breakdown_by: { operation: 'terms', fields: ['product', 'category'] },
              },
              {
                dataset: { type: 'dataView', id: 'myDataView' },
                type: 'referenceLines',
                thresholds: [
                  {
                    operation: 'median',
                    field: 'price',
                    label: 'Median Price',
                    color: { type: 'static', color: 'red' },
                    text: 'label',
                  },
                  {
                    operation: 'average',
                    field: 'price',
                    label: 'Average Price',
                    color: { type: 'static', color: 'blue' },
                    text: 'label',
                  },
                ],
              },
              {
                type: 'annotations',
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
                    text: 'label',
                    color: {
                      type: 'static',
                      color: '#0000ff',
                    },
                  },
                ],
              },
            ],
          })
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
          })
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
        })
      ).toThrow();
    });

    it('should not let mix esql dataset with dsl operations', () => {
      expect(() =>
        xyStateSchema.validate({
          type: 'xy',
          title: `Faulty Chart`,
          layers: [
            {
              dataset: { type: 'esql', query: 'FROM company_index' },
              type: 'bar',
              x: { operation: 'date_histogram', field: 'order_date' },
              y: [{ operation: 'count' }, { operation: 'average', field: 'price' }],
              breakdown_by: { operation: 'terms', fields: ['product', 'category'] },
            },
          ],
        })
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
              x: { operation: 'date_histogram', field: 'order_date' },
              y: [{ operation: 'count' }],
            },
            {
              type: 'annotations',
              dataset: {
                type: 'esql',
                query:
                  'FROM kibana_simple_logs_data | EVAL timestamp = order_date | FILTER product == "xyz" ',
              },
              events: [
                {
                  type: 'point',
                  name: 'Event',
                  timestamp: '2023-01-01T00:00:00Z',
                  text: { type: 'label', text: 'New Year' },
                  color: {
                    type: 'static',
                    color: '#ff0000',
                  },
                },
              ],
            },
          ],
        })
      ).toThrow();
    });
  });

  it('should track number of statistics options', () => {
    const realStatisticsOptionsSize = (statisticsSchema.getSchema() as any)?.$_root?._types?.size;

    expect(statisticsOptionsSize).toBe(realStatisticsOptionsSize);
  });
});
