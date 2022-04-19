/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

import { getDimensions } from './get_dimensions';
import { indexPatternWithTimefieldMock } from '../../../__mocks__/index_pattern_with_timefield';
import { ISearchSource, calculateBounds } from '@kbn/data-plugin/public';
import { getChartAggConfigs } from './get_chart_agg_configs';

test('getDimensions', () => {
  const indexPattern = indexPatternWithTimefieldMock;
  const setField = jest.fn();
  const searchSource = {
    setField,
    removeField: jest.fn(),
    getField: (name: string) => {
      if (name === 'index') {
        return indexPattern;
      }
    },
  } as unknown as ISearchSource;

  const dataMock = dataPluginMock.createStartContract();
  dataMock.query.timefilter.timefilter.getTime = () => {
    return { from: '1991-03-29T08:04:00.694Z', to: '2021-03-29T07:04:00.695Z' };
  };
  dataMock.query.timefilter.timefilter.calculateBounds = (timeRange) => {
    return calculateBounds(timeRange);
  };

  const aggsConfig = getChartAggConfigs(searchSource, 'auto', dataMock);
  const actual = getDimensions(aggsConfig!, dataMock);
  expect(actual).toMatchInlineSnapshot(`
    Object {
      "x": Object {
        "accessor": 0,
        "format": Object {
          "id": "date",
          "params": Object {
            "pattern": "HH:mm:ss.SSS",
          },
        },
        "label": "timestamp per 0 milliseconds",
        "params": Object {
          "bounds": Object {
            "max": "2021-03-29T07:04:00.695Z",
            "min": "1991-03-29T08:04:00.694Z",
          },
          "date": true,
          "format": "HH:mm:ss.SSS",
          "interval": "P0D",
          "intervalESUnit": "ms",
          "intervalESValue": 0,
        },
      },
      "y": Object {
        "accessor": 1,
        "format": Object {
          "id": "number",
        },
        "label": "Count",
      },
    }
  `);
});
