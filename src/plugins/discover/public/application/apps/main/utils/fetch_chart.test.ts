/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { FetchStatus } from '../../../types';
import { BehaviorSubject, of, throwError as throwErrorRx } from 'rxjs';
import { RequestAdapter } from '../../../../../../inspector';
import { savedSearchMockWithTimeField } from '../../../../__mocks__/saved_search';
import { fetchChart, updateSearchSource } from './fetch_chart';
import { ReduxLikeStateContainer } from '../../../../../../kibana_utils/common';
import { AppState } from '../services/discover_state';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { calculateBounds, IKibanaSearchResponse } from '../../../../../../data/common';
import { estypes } from '@elastic/elasticsearch';

function getDataSubjects() {
  return {
    main$: new BehaviorSubject({ fetchStatus: FetchStatus.UNINITIALIZED }),
    documents$: new BehaviorSubject({ fetchStatus: FetchStatus.UNINITIALIZED }),
    totalHits$: new BehaviorSubject({ fetchStatus: FetchStatus.UNINITIALIZED }),
    charts$: new BehaviorSubject({ fetchStatus: FetchStatus.UNINITIALIZED }),
  };
}

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
  });

  test('changes of fetchStatus when starting with FetchStatus.UNINITIALIZED', async (done) => {
    const subjects = getDataSubjects();
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
      searchSessionId: '123',
    };
    deps.data.query.timefilter.timefilter.getTime = () => {
      return { from: '2021-07-07T00:05:13.590', to: '2021-07-07T11:20:13.590' };
    };

    deps.data.query.timefilter.timefilter.calculateBounds = (timeRange) =>
      calculateBounds(timeRange);

    const stateArrChart: FetchStatus[] = [];
    const stateArrHits: FetchStatus[] = [];

    subjects.charts$.subscribe((value) => stateArrChart.push(value.fetchStatus));
    subjects.totalHits$.subscribe((value) => stateArrHits.push(value.fetchStatus));

    savedSearchMockWithTimeField.searchSource.fetch$ = () =>
      of({
        id: 'Fjk5bndxTHJWU2FldVRVQ0tYR0VqOFEcRWtWNDhOdG5SUzJYcFhONVVZVTBJQToxMDMwOQ==',
        rawResponse: {
          took: 2,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { max_score: null, hits: [] },
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
      } as unknown as IKibanaSearchResponse<estypes.SearchResponse<unknown>>);

    fetchChart(subjects, savedSearchMockWithTimeField.searchSource, deps).subscribe({
      complete: () => {
        expect(stateArrChart).toEqual([
          FetchStatus.UNINITIALIZED,
          FetchStatus.LOADING,
          FetchStatus.COMPLETE,
        ]);
        expect(stateArrHits).toEqual([
          FetchStatus.UNINITIALIZED,
          FetchStatus.LOADING,
          FetchStatus.COMPLETE,
        ]);
        done();
      },
    });
  });
  test('change of fetchStatus on fetch error', async (done) => {
    const subjects = getDataSubjects();

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
      searchSessionId: '123',
    };

    savedSearchMockWithTimeField.searchSource.fetch$ = () => throwErrorRx({ msg: 'Oh noes!' });

    const stateArrChart: FetchStatus[] = [];
    const stateArrHits: FetchStatus[] = [];

    subjects.charts$.subscribe((value) => stateArrChart.push(value.fetchStatus));
    subjects.totalHits$.subscribe((value) => stateArrHits.push(value.fetchStatus));

    fetchChart(subjects, savedSearchMockWithTimeField.searchSource, deps).subscribe({
      error: () => {
        expect(stateArrChart).toEqual([
          FetchStatus.UNINITIALIZED,
          FetchStatus.LOADING,
          FetchStatus.ERROR,
        ]);
        expect(stateArrHits).toEqual([
          FetchStatus.UNINITIALIZED,
          FetchStatus.LOADING,
          FetchStatus.ERROR,
        ]);
        done();
      },
    });
  });
});
