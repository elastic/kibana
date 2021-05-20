/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Subject } from 'rxjs';
import { renderHook } from '@testing-library/react-hooks';
import { createSearchSessionMock } from '../../../../__mocks__/search_session';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { indexPatternMock } from '../../../../__mocks__/index_pattern';
import { useSavedSearch } from './use_saved_search';
import { AppState, getState } from './discover_state';
import { uiSettingsMock } from '../../../../__mocks__/ui_settings';
import { useDiscoverState } from './use_discover_state';

describe('test useSavedSearch', () => {
  test('useSavedSearch return is valid', async () => {
    const { history, searchSessionManager } = createSearchSessionMock();
    const stateContainer = getState({
      getStateDefaults: () => ({ index: 'the-index-pattern-id' }),
      history,
      uiSettings: uiSettingsMock,
    });

    const { result } = renderHook(() => {
      return useSavedSearch({
        indexPattern: indexPatternMock,
        savedSearch: savedSearchMock,
        searchSessionManager,
        searchSource: savedSearchMock.searchSource.createCopy(),
        services: discoverServiceMock,
        state: {} as AppState,
        stateContainer,
        useNewFieldsApi: true,
      });
    });

    expect(result.current.refetch$).toBeInstanceOf(Subject);
    expect(result.current.savedSearch$.value).toMatchInlineSnapshot(`
      Object {
        "state": "loading",
      }
    `);
    expect(result.current.shouldSearchOnPageLoad).toBeInstanceOf(Function);
  });
  test('refetch$ triggers a search', async () => {
    const { history, searchSessionManager } = createSearchSessionMock();
    const stateContainer = getState({
      getStateDefaults: () => ({ index: 'the-index-pattern-id' }),
      history,
      uiSettings: uiSettingsMock,
    });

    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
    });

    const { result: resultState } = renderHook(() => {
      return useDiscoverState({
        services: discoverServiceMock,
        history,
        initialIndexPattern: indexPatternMock,
        initialSavedSearch: savedSearchMock,
      });
    });

    const { result, waitForValueToChange } = renderHook(() => {
      return useSavedSearch({
        indexPattern: indexPatternMock,
        savedSearch: savedSearchMock,
        searchSessionManager,
        searchSource: resultState.current.searchSource,
        services: discoverServiceMock,
        state: {} as AppState,
        stateContainer,
        useNewFieldsApi: true,
      });
    });

    result.current.refetch$.next();

    await waitForValueToChange(() => {
      return result.current.savedSearch$.value.state === 'complete';
    });

    expect(result.current.savedSearch$.value).toMatchInlineSnapshot(`
      Object {
        "fieldCounts": Object {},
        "hits": 0,
        "inspectorAdapters": Object {
          "requests": RequestAdapter {
            "_events": Object {},
            "_eventsCount": 0,
            "_maxListeners": undefined,
            "requests": Map {
              "ad631786-d209-437b-94c2-e89fe4ba9d92" => Object {
                "description": "This request queries Elasticsearch to fetch the data for the search.",
                "id": "ad631786-d209-437b-94c2-e89fe4ba9d92",
                "json": Object {
                  "_source": false,
                  "fields": Array [
                    Object {
                      "field": "_source",
                    },
                    Object {
                      "field": "_index",
                    },
                    Object {
                      "field": "message",
                    },
                    Object {
                      "field": "extension",
                    },
                    Object {
                      "field": "bytes",
                    },
                    Object {
                      "field": "scripted",
                    },
                    Object {
                      "field": "object.value",
                    },
                  ],
                  "highlight": undefined,
                  "query": Object {
                    "bool": Object {
                      "filter": Array [],
                      "must": Array [],
                      "must_not": Array [],
                      "should": Array [],
                    },
                  },
                  "runtime_mappings": Object {},
                  "script_fields": Object {},
                  "sort": Array [
                    Object {
                      "_score": Object {
                        "order": "desc",
                      },
                    },
                  ],
                  "stored_fields": Array [
                    "*",
                  ],
                  "track_total_hits": true,
                  "version": true,
                },
                "name": "data",
                "response": Object {
                  "json": Object {
                    "isPartial": false,
                    "isRunning": false,
                    "rawResponse": Object {
                      "hits": Object {
                        "hits": Array [],
                        "total": 0,
                      },
                    },
                  },
                },
                "searchSessionId": undefined,
                "startTime": 1621513417238,
                "stats": Object {
                  "hits": Object {
                    "description": "The number of documents returned by the query.",
                    "label": "Hits",
                    "value": "0",
                  },
                  "hitsTotal": Object {
                    "description": "The number of documents that match the query.",
                    "label": "Hits (total)",
                    "value": "0",
                  },
                  "indexPattern": Object {
                    "description": "The index pattern that connected to the Elasticsearch indices.",
                    "label": "Index pattern",
                    "value": "the-index-pattern-title",
                  },
                  "indexPatternId": Object {
                    "description": "The ID in the .kibana index.",
                    "label": "Index pattern ID",
                    "value": "the-index-pattern-id",
                  },
                  "requestTimestamp": Object {
                    "description": "Time when the start of the request has been logged",
                    "label": "Request timestamp",
                    "value": "2021-05-20T12:23:37.238Z",
                  },
                },
                "status": 1,
                "time": 8,
              },
            },
            Symbol(kCapture): false,
          },
        },
        "rows": Array [],
        "state": "complete",
      }
    `);
  });
});
