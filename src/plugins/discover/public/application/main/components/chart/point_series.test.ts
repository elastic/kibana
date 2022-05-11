/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildPointSeriesData } from './point_series';
import moment from 'moment';
import { Unit } from '@kbn/datemath';

describe('buildPointSeriesData', () => {
  test('with valid data', () => {
    const table = {
      type: 'datatable',
      columns: [
        {
          id: 'col-0-2',
          name: 'order_date per 30 days',
          meta: {
            type: 'date',
            field: 'order_date',
            index: 'kibana_sample_data_ecommerce',
            params: { id: 'date', params: { pattern: 'YYYY-MM-DD' } },
            source: 'esaggs',
            sourceParams: {
              indexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
              id: '2',
              enabled: true,
              type: 'date_histogram',
              params: {
                field: 'order_date',
                timeRange: { from: 'now-15y', to: 'now' },
                useNormalizedEsInterval: true,
                scaleMetricValues: false,
                interval: 'auto',
                used_interval: '30d',
                drop_partials: false,
                min_doc_count: 1,
                extended_bounds: {},
              },
              schema: 'segment',
            },
          },
        },
        {
          id: 'col-1-1',
          name: 'Count',
          meta: {
            type: 'number',
            index: 'kibana_sample_data_ecommerce',
            params: { id: 'number' },
            source: 'esaggs',
            sourceParams: {
              indexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
              id: '1',
              enabled: true,
              type: 'count',
              params: {},
              schema: 'metric',
            },
          },
        },
      ],
      rows: [{ 'col-0-2': 1625176800000, 'col-1-1': 2139 }],
    };
    const dimensions = {
      x: {
        accessor: 0,
        label: 'order_date per 30 days',
        format: { id: 'date', params: { pattern: 'YYYY-MM-DD' } },
        params: {
          date: true,
          interval: moment.duration(30, 'd'),
          intervalESValue: 30,
          intervalESUnit: 'd' as Unit,
          format: 'YYYY-MM-DD',
          bounds: {
            min: moment('2006-07-29T11:08:13.078Z'),
            max: moment('2021-07-29T11:08:13.078Z'),
          },
        },
      },
      y: { accessor: 1, format: { id: 'number' }, label: 'Count' },
    } as const;
    expect(buildPointSeriesData(table, dimensions)).toMatchInlineSnapshot(`
      Object {
        "ordered": Object {
          "date": true,
          "interval": "P30D",
          "intervalESUnit": "d",
          "intervalESValue": 30,
          "max": "2021-07-29T11:08:13.078Z",
          "min": "2006-07-29T11:08:13.078Z",
        },
        "values": Array [
          Object {
            "x": 1625176800000,
            "y": 2139,
          },
        ],
        "xAxisFormat": Object {
          "id": "date",
          "params": Object {
            "pattern": "YYYY-MM-DD",
          },
        },
        "xAxisLabel": "order_date per 30 days",
        "xAxisOrderedValues": Array [
          1625176800000,
        ],
        "yAxisFormat": Object {
          "id": "number",
        },
        "yAxisLabel": "Count",
      }
    `);
  });
});
