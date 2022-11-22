/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Datatable, DatatableColumn } from '@kbn/expressions-plugin/public';
import { getFilterClickData, getFilterEventData } from './filter_helpers';
import { createMockBucketColumns, createMockVisData } from '../mocks';
import { consolidateMetricColumns } from '../../common/utils';
import { LayerValue } from '@elastic/charts';
import faker from 'faker';

const bucketColumns = createMockBucketColumns();
const visData = createMockVisData();

describe('getFilterClickData', () => {
  it('returns the correct filter data for the specific layer', () => {
    const clickedLayers: LayerValue[] = [
      {
        groupByRollup: 'Logstash Airways',
        value: 729,
        depth: 1,
        path: [],
        sortIndex: 1,
        smAccessorValue: '',
      },
    ];
    const data = getFilterClickData(
      clickedLayers,
      bucketColumns,
      visData.columns[1].id,
      visData,
      visData,
      1
    );
    expect(data.length).toEqual(clickedLayers.length);
    expect(data[0].value).toEqual('Logstash Airways');
    expect(data[0].row).toEqual(0);
    expect(data[0].column).toEqual(0);
  });

  it('changes the filter if the user clicks on another layer', () => {
    const clickedLayers: LayerValue[] = [
      {
        groupByRollup: 'ES-Air',
        value: 572,
        depth: 1,
        path: [],
        sortIndex: 1,
        smAccessorValue: '',
      },
    ];
    const data = getFilterClickData(
      clickedLayers,
      bucketColumns,
      visData.columns[1].id,
      visData,
      visData,
      1
    );
    expect(data.length).toEqual(clickedLayers.length);
    expect(data[0].value).toEqual('ES-Air');
    expect(data[0].row).toEqual(4);
    expect(data[0].column).toEqual(0);
  });

  it('returns the correct filters for small multiples', () => {
    const clickedLayers: LayerValue[] = [
      {
        groupByRollup: 'ES-Air',
        value: 572,
        depth: 1,
        path: [],
        sortIndex: 1,
        smAccessorValue: 1,
      },
    ];
    const splitDimension = {
      id: 'col-2-3',
      name: 'Cancelled: Descending',
    } as DatatableColumn;
    const data = getFilterClickData(
      clickedLayers,
      bucketColumns,
      visData.columns[1].id,
      visData,
      visData,
      1,
      splitDimension
    );
    expect(data.length).toEqual(2);
    expect(data[0].value).toEqual('ES-Air');
    expect(data[0].row).toEqual(5);
    expect(data[0].column).toEqual(0);
    expect(data[1].value).toEqual(1);
  });

  it('returns the correct filters for small multiples if there are no bucket dimensions', () => {
    const clickedLayers = [
      {
        groupByRollup: 'Count',
        value: 797,
        depth: 0,
        path: [],
        sortIndex: 0,
        smAccessorValue: 'ES-Air',
      },
    ];
    const splitDimension = {
      id: 'col-0-2',
      name: 'Carrier: Descending',
    } as DatatableColumn;
    const data = getFilterClickData(
      clickedLayers,
      [{ name: 'Count' }],
      visData.columns[1].id,
      visData,
      visData,
      1,
      splitDimension
    );
    expect(data.length).toEqual(2);
    expect(data[0].value).toEqual('Count');
    expect(data[0].row).toEqual(4);
    expect(data[0].column).toEqual(1);

    expect(data[1].value).toEqual('ES-Air');
    expect(data[1].row).toEqual(4);
    expect(data[1].column).toEqual(0);
  });

  describe('multi-metric scenarios', () => {
    describe('with original bucket columns', () => {
      const originalTable: Datatable = {
        type: 'datatable',
        columns: [
          { name: 'shape', id: '0', meta: { type: 'string' } },
          { name: 'color', id: '1', meta: { type: 'string' } },
          {
            name: 'metric1',
            id: '2',
            meta: {
              type: 'number',
            },
          },
          {
            name: 'metric2',
            id: '3',
            meta: {
              type: 'number',
            },
          },
        ],
        rows: [
          { '0': 'square', '1': 'red', '2': 1, '3': 2 },
          { '0': 'square', '1': 'blue', '2': 3, '3': 4 },
          { '0': 'circle', '1': 'green', '2': 5, '3': 6 },
          { '0': 'circle', '1': 'gray', '2': 7, '3': 8 },
        ],
      };

      const { table: consolidatedTable } = consolidateMetricColumns(
        originalTable,
        ['0', '1'],
        ['2', '3'],
        {
          2: 'metric1',
          3: 'metric2',
        }
      );

      it('generates the correct filters', () => {
        const localBucketColumns = consolidatedTable.columns.slice(0, 3);

        const clickedLayers: LayerValue[] = [
          {
            groupByRollup: 'circle',
            value: faker.random.number(),
            depth: faker.random.number(),
            path: [],
            sortIndex: faker.random.number(),
            smAccessorValue: '',
          },
          {
            groupByRollup: 'green',
            value: faker.random.number(),
            depth: faker.random.number(),
            path: [],
            sortIndex: faker.random.number(),
            smAccessorValue: '',
          },
          {
            groupByRollup: 'metric2',
            value: faker.random.number(),
            depth: faker.random.number(),
            path: [],
            sortIndex: faker.random.number(),
            smAccessorValue: '',
          },
        ];

        const data = getFilterClickData(
          clickedLayers,
          localBucketColumns,
          'value',
          consolidatedTable,
          originalTable,
          2
        );

        expect(data).toHaveLength(3);

        expect(data.map((datum) => ({ ...datum, table: undefined }))).toMatchInlineSnapshot(`
          Array [
            Object {
              "column": 0,
              "row": 2,
              "table": undefined,
              "value": "circle",
            },
            Object {
              "column": 1,
              "row": 2,
              "table": undefined,
              "value": "green",
            },
            Object {
              "column": 3,
              "row": 2,
              "table": undefined,
              "value": "metric2",
            },
          ]
        `);

        expect(data.map((datum) => datum.table === originalTable).every(Boolean)).toBe(true);
      });
    });
  });
});

describe('getFilterEventData', () => {
  it('returns the correct filter data for the specific series', () => {
    const series = {
      key: 'Kibana Airlines',
      specId: 'pie',
    };
    const data = getFilterEventData(visData, series);
    expect(data[0].value).toEqual('Kibana Airlines');
    expect(data[0].row).toEqual(6);
    expect(data[0].column).toEqual(0);
  });

  it('changes the filter if the user clicks on another series', () => {
    const series = {
      key: 'JetBeats',
      specId: 'pie',
    };
    const data = getFilterEventData(visData, series);
    expect(data[0].value).toEqual('JetBeats');
    expect(data[0].row).toEqual(2);
    expect(data[0].column).toEqual(0);
  });
});
