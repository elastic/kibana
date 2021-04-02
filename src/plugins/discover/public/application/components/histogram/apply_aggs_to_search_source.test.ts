/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { indexPatternWithTimefieldMock } from '../../../__mocks__/index_pattern_with_timefield';
import { SearchSource } from '../../../../../data/public';
import { dataPluginMock } from '../../../../../data/public/mocks';
import { applyAggsToSearchSource } from './apply_aggs_to_search_source';

describe('applyAggsToSearchSource', () => {
  test('enabled = true', () => {
    const indexPattern = indexPatternWithTimefieldMock;
    const setField = jest.fn();
    const searchSource = ({
      setField,
      removeField: jest.fn(),
    } as unknown) as SearchSource;

    const dataMock = dataPluginMock.createStartContract();

    const aggsConfig = applyAggsToSearchSource(true, searchSource, 'auto', indexPattern, dataMock);

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

    expect(setField).toHaveBeenCalledWith('aggs', expect.any(Function));
    const dslFn = setField.mock.calls[0][1];
    expect(dslFn()).toMatchInlineSnapshot(`
          Object {
            "2": Object {
              "date_histogram": Object {
                "field": "timestamp",
                "min_doc_count": 1,
                "time_zone": "America/New_York",
              },
            },
          }
      `);
  });

  test('enabled = false', () => {
    const indexPattern = indexPatternWithTimefieldMock;
    const setField = jest.fn();
    const getField = jest.fn(() => {
      return true;
    });
    const removeField = jest.fn();
    const searchSource = ({
      getField,
      setField,
      removeField,
    } as unknown) as SearchSource;

    const dataMock = dataPluginMock.createStartContract();

    const aggsConfig = applyAggsToSearchSource(false, searchSource, 'auto', indexPattern, dataMock);
    expect(aggsConfig).toBeFalsy();
    expect(getField).toHaveBeenCalledWith('aggs');
    expect(removeField).toHaveBeenCalledWith('aggs');
  });
});
