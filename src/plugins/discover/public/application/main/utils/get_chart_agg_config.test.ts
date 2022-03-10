/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { indexPatternWithTimefieldMock } from '../../../__mocks__/index_pattern_with_timefield';
import { ISearchSource } from '../../../../../data/public';
import { dataPluginMock } from '../../../../../data/public/mocks';
import { getChartAggConfigs } from './get_chart_agg_configs';

describe('getChartAggConfigs', () => {
  test('is working', () => {
    const indexPattern = indexPatternWithTimefieldMock;
    const setField = jest.fn();
    const searchSource = {
      setField,
      getField: (name: string) => {
        if (name === 'index') {
          return indexPattern;
        }
      },
      removeField: jest.fn(),
    } as unknown as ISearchSource;

    const dataMock = dataPluginMock.createStartContract();

    const aggsConfig = getChartAggConfigs(searchSource, 'auto', dataMock);

    expect(aggsConfig!.aggs).toMatchInlineSnapshot(`
      Array [
        Object {
          "enabled": true,
          "id": "1",
          "params": Object {},
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
