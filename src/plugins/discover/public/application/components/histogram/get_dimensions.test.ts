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
  } as unknown) as SearchSource;

  const dataMock = dataPluginMock.createStartContract();
  dataMock.query.timefilter.timefilter.getTime = () => {
    return { from: 'now-30y', to: 'now' };
  };
  dataMock.query.timefilter.timefilter.calculateBounds = (timeRange) => {
    return calculateBounds(timeRange);
  };

  const aggsConfig = applyAggsToSearchSource(true, searchSource, 'auto', indexPattern, dataMock);
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
            "bounds": undefined,
            "date": true,
            "format": "HH:mm:ss.SSS",
            "interval": "P365D",
            "intervalESUnit": "d",
            "intervalESValue": 365,
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
