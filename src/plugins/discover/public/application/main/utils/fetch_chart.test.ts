/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { of, throwError as throwErrorRx } from 'rxjs';
import { RequestAdapter } from '@kbn/inspector-plugin';
import { savedSearchMockWithTimeField } from '../../../__mocks__/saved_search';
import { fetchChart, updateSearchSource } from './fetch_chart';
import { ReduxLikeStateContainer } from '@kbn/kibana-utils-plugin/common';
import { AppState } from '../services/discover_state';
import { discoverServiceMock } from '../../../__mocks__/services';
import { calculateBounds, IKibanaSearchResponse } from '@kbn/data-plugin/public';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FetchDeps } from './fetch_all';

function getDeps() {
  const deps = {
    appStateContainer: {
      getState: () => {
        return { interval: 'auto' };
      },
    } as ReduxLikeStateContainer<AppState>,
    abortController: new AbortController(),
    data: discoverServiceMock.data,
    inspectorAdapters: { requests: new RequestAdapter() },
    onResults: jest.fn(),
    savedSearch: savedSearchMockWithTimeField,
    searchSessionId: '123',
  } as unknown as FetchDeps;
  deps.data.query.timefilter.timefilter.getTime = () => {
    return { from: '2021-07-07T00:05:13.590', to: '2021-07-07T11:20:13.590' };
  };

  deps.data.query.timefilter.timefilter.calculateBounds = (timeRange) => calculateBounds(timeRange);
  return deps;
}

const requestResult = {
  id: 'Fjk5bndxTHJWU2FldVRVQ0tYR0VqOFEcRWtWNDhOdG5SUzJYcFhONVVZVTBJQToxMDMwOQ==',
  rawResponse: {
    took: 2,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { max_score: null, hits: [], total: 42 },
    aggregations: {
      '2': {
        buckets: [
          {
            key_as_string: '2021-07-07T06:36:00.000+02:00',
            key: 1625632560000,
            doc_count: 1,
          },
        ],
      },
    },
  },
  isPartial: false,
  isRunning: false,
  total: 1,
  loaded: 1,
  isRestored: false,
} as unknown as IKibanaSearchResponse<estypes.SearchResponse<unknown>>;

describe('test fetchCharts', () => {
  test('updateSearchSource helper function', () => {
    const chartAggConfigs = updateSearchSource(
      savedSearchMockWithTimeField.searchSource,
      'auto',
      discoverServiceMock.data
    );
    expect(chartAggConfigs.aggs).toMatchInlineSnapshot(`
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
            "useNormalizedEsInterval": true,
            "used_interval": "0ms",
          },
          "schema": "segment",
          "type": "date_histogram",
        },
      ]
    `);
  });

  test('resolves with summarized chart data', async () => {
    savedSearchMockWithTimeField.searchSource.fetch$ = () => of(requestResult);

    const result = await fetchChart(savedSearchMockWithTimeField.searchSource, getDeps());
    expect(result).toHaveProperty('totalHits', 42);
    expect(result).toHaveProperty('bucketInterval.description', '0 milliseconds');
    expect(result).toHaveProperty('chartData');
  });

  test('rejects promise on query failure', async () => {
    savedSearchMockWithTimeField.searchSource.fetch$ = () => throwErrorRx({ msg: 'Oh noes!' });

    await expect(fetchChart(savedSearchMockWithTimeField.searchSource, getDeps())).rejects.toEqual({
      msg: 'Oh noes!',
    });
  });

  test('fetch$ is called with request specific execution context', async () => {
    const fetch$Mock = jest.fn().mockReturnValue(of(requestResult));

    savedSearchMockWithTimeField.searchSource.fetch$ = fetch$Mock;

    await fetchChart(savedSearchMockWithTimeField.searchSource, getDeps());
    expect(fetch$Mock.mock.calls[0][0].executionContext).toMatchInlineSnapshot(`
      Object {
        "description": "fetch chart data and total hits",
      }
    `);
  });
});
