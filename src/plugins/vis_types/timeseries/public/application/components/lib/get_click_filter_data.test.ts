/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { XYChartSeriesIdentifier, GeometryValue } from '@elastic/charts';
import { getClickFilterData } from './get_click_filter_data';
import type { TSVBTables } from './types';
import { TimeseriesVisParams } from '../../../types';
import { SERIES_SEPARATOR } from '../../../../common/constants';

describe('getClickFilterData', () => {
  test('gets the correct data for a group by everything timeseries chart', () => {
    const points = [
      [
        {
          x: 1620032400000,
          y: 72,
          accessor: 'y1',
          datum: [1620032400000, 72],
        },
        {
          key: 'groupId{yaxis_50589930-ad98-11eb-b6f6-59011d7388b7_main_group}spec{61ca57f1-469d-11e7-af02-69e470af7417}yAccessor{1}splitAccessors{}',
          specId: '61ca57f1-469d-11e7-af02-69e470af7417',
          yAccessor: 1,
        },
      ],
    ] as Array<[GeometryValue, XYChartSeriesIdentifier]>;
    const tables = {
      '61ca57f1-469d-11e7-af02-69e470af7417': {
        type: 'datatable',
        rows: [
          [1620010800000, 8],
          [1620021600000, 33],
          [1620032400000, 72],
          [1620043200000, 66],
          [1620054000000, 36],
          [1620064800000, 11],
        ],
        columns: [
          {
            id: '0',
            name: 'timestamp',
            meta: {
              type: 'date',
              field: 'timestamp',
              index: 'kibana_sample_data_logs',
              source: 'esaggs',
              sourceParams: {
                enabled: true,
                indexPatternId: '90943e30-9a47-11e8-b64d-95841ca0b247',
                type: 'date_histogram',
                schema: 'group',
                params: {
                  field: 'timestamp',
                },
              },
            },
          },
          {
            id: '1',
            name: 'Count',
            meta: {
              type: 'number',
              index: 'kibana_sample_data_logs',
              source: 'esaggs',
              sourceParams: {
                enabled: true,
                indexPatternId: '90943e30-9a47-11e8-b64d-95841ca0b247',
                type: 'count',
                schema: 'metric',
                params: {},
              },
            },
          },
        ],
      },
    } as TSVBTables;
    const model = {
      series: [
        {
          id: '61ca57f1-469d-11e7-af02-69e470af7417',
          split_mode: 'everything',
        },
      ],
    } as TimeseriesVisParams;
    const data = getClickFilterData(points, tables, model);
    expect(data[0].column).toEqual(0);
    expect(data[0].row).toEqual(2);
    expect(data[0].value).toEqual(points[0][0].x);
  });

  test('gets the correct data for a group by terms timeseries chart', () => {
    const points = [
      [
        {
          x: 1619481600000,
          y: 3,
          accessor: 'y1',
          datum: [1619481600000, 3],
        },
        {
          key: 'groupId{yaxis_6e0353a0-ad9b-11eb-b112-89cce8e43380_main_group}spec{61ca57f1-469d-11e7-af02-69e470af7417:1}yAccessor{1}splitAccessors{}',
          specId: '61ca57f1-469d-11e7-af02-69e470af7417╰┄►1',
        },
      ],
    ] as Array<[GeometryValue, XYChartSeriesIdentifier]>;
    const tables = {
      '61ca57f1-469d-11e7-af02-69e470af7417': {
        type: 'datatable',
        rows: [
          [1619449200000, 31, 0],
          [1619460000000, 36, 0],
          [1619470800000, 35, 0],
          [1619481600000, 40, 0],
          [1619492400000, 38, 0],
          [1619503200000, 30, 0],
          [1620172800000, 0, 0],
          [1619449200000, 4, 1],
          [1619460000000, 4, 1],
          [1619470800000, 3, 1],
          [1619481600000, 3, 1],
          [1619492400000, 2, 1],
          [1619503200000, 3, 1],
        ],
        columns: [
          {
            id: '0',
            name: 'timestamp',
            meta: {
              type: 'date',
              field: 'timestamp',
              index: 'kibana_sample_data_flights',
              source: 'esaggs',
              sourceParams: {
                enabled: true,
                indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
                type: 'date_histogram',
                schema: 'group',
                params: {
                  field: 'timestamp',
                },
              },
            },
          },
          {
            id: '1',
            name: 'Count',
            meta: {
              type: 'number',
              index: 'kibana_sample_data_flights',
              source: 'esaggs',
              sourceParams: {
                enabled: true,
                indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
                type: 'count',
                schema: 'metric',
                params: {},
              },
            },
          },
          {
            id: '2',
            name: 'Cancelled',
            meta: {
              type: 'boolean',
              field: 'Cancelled',
              index: 'kibana_sample_data_flights',
              source: 'esaggs',
              sourceParams: {
                enabled: true,
                indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
                type: 'terms',
                schema: 'group',
                params: {
                  field: 'Cancelled',
                },
              },
            },
          },
        ],
      },
    } as TSVBTables;
    const model = {
      series: [
        {
          id: '61ca57f1-469d-11e7-af02-69e470af7417',
          split_mode: 'terms',
        },
      ],
    } as TimeseriesVisParams;
    const data = getClickFilterData(points, tables, model);
    expect(data.length).toEqual(2);
    expect(data[0].column).toEqual(0);
    expect(data[0].row).toEqual(10);
    expect(data[0].value).toEqual(points[0][0].x);

    expect(data[1].column).toEqual(2);
    expect(data[1].row).toEqual(10);
    // expect(data).toEqual([]);
    const splitValue = points[0][1].specId.split(SERIES_SEPARATOR);
    expect(data[1].value).toEqual(parseInt(splitValue[1], 10));
  });
});
