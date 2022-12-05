/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { getChartAggConfigs } from './get_chart_agg_configs';

describe('getChartAggConfigs', () => {
  test('is working', () => {
    const dataView = dataViewWithTimefieldMock;
    const dataMock = dataPluginMock.createStartContract();
    const aggsConfig = getChartAggConfigs({
      dataView,
      timeInterval: 'auto',
      data: dataMock,
      timeRange: {
        from: '2022-10-05T16:00:00.000-03:00',
        to: '2022-10-05T18:00:00.000-03:00',
      },
    });

    expect(aggsConfig!.aggs).toMatchInlineSnapshot(`
      Array [
        Object {
          "enabled": true,
          "id": "1",
          "params": Object {
            "emptyAsNull": false,
          },
          "schema": "metric",
          "type": "count",
        },
        Object {
          "enabled": true,
          "id": "2",
          "params": Object {
            "drop_partials": false,
            "extendToTimeRange": false,
            "extended_bounds": Object {},
            "field": "timestamp",
            "interval": "auto",
            "min_doc_count": 1,
            "scaleMetricValues": false,
            "timeRange": Object {
              "from": "2022-10-05T16:00:00.000-03:00",
              "to": "2022-10-05T18:00:00.000-03:00",
            },
            "useNormalizedEsInterval": true,
            "used_interval": "0ms",
          },
          "schema": "segment",
          "type": "date_histogram",
        },
      ]
    `);
  });
});
