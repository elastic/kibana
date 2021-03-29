/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { dataPluginMock } from '../../../../../data/public/mocks';

import { getDimensions } from './get_dimensions';
import { indexPatternWithTimefieldMock } from '../../../__mocks__/index_pattern_with_timefield';
import { SearchSource } from '../../../../../data/common/search/search_source';
import { applyAggsToSearchSource } from './apply_aggs_to_search_source';
import { calculateBounds } from '../../../../../data/common/query/timefilter';

test('getDimensions', () => {
  const indexPattern = indexPatternWithTimefieldMock;
  const setField = jest.fn();
  const searchSource = ({
    setField,
    removeField: jest.fn(),
    getField: (name: string) => {
      if (name === 'index') {
        return indexPattern;
      }
    },
  } as unknown) as SearchSource;

  const dataMock = dataPluginMock.createStartContract();
  dataMock.query.timefilter.timefilter.getTime = () => {
    return { from: '1991-03-29T08:04:00.694Z', to: '2021-03-29T07:04:00.695Z' };
  };
  dataMock.query.timefilter.timefilter.calculateBounds = (timeRange) => {
    return calculateBounds(timeRange);
  };

  const aggsConfig = applyAggsToSearchSource(searchSource, 'auto', dataMock);
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
