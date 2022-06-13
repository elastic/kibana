/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import { IUiSettingsClient } from 'kibana/public';
import { getState } from './context_state';
import { createBrowserHistory, History } from 'history';
import { FilterManager } from '../../../../../data/public';
import { coreMock } from '../../../../../../core/public/mocks';
import { SEARCH_FIELDS_FROM_SOURCE } from '../../../../common';

const setupMock = coreMock.createSetup();

describe('Test Discover Context State', () => {
  let history: History;
  let state: ReturnType<typeof getState>;
  const getCurrentUrl = () => history.createHref(history.location);
  beforeEach(async () => {
    history = createBrowserHistory();
    history.push('/');
    state = getState({
      defaultSize: 4,
      history,
      uiSettings: {
        get: <T>(key: string) =>
          (key === SEARCH_FIELDS_FROM_SOURCE ? true : ['_source']) as unknown as T,
      } as IUiSettingsClient,
    });
    state.startSync();
  });
  afterEach(() => {
    state.stopSync();
  });
  test('getState function default return', () => {
    expect(state.appState.getState()).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "_source",
        ],
        "filters": Array [],
        "predecessorCount": 4,
        "successorCount": 4,
      }
    `);
    expect(state.globalState.getState()).toMatchInlineSnapshot(`null`);
    expect(state.startSync).toBeDefined();
    expect(state.stopSync).toBeDefined();
    expect(state.getFilters()).toStrictEqual([]);
  });
  test('getState -> setAppState syncing to url', async () => {
    state.setAppState({ predecessorCount: 10 });
    state.flushToUrl();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(_source),filters:!(),predecessorCount:10,successorCount:4)"`
    );
  });
  test('getState -> url to appState syncing', async () => {
    history.push('/#?_a=(columns:!(_source),predecessorCount:1,successorCount:1)');
    expect(state.appState.getState()).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "_source",
        ],
        "predecessorCount": 1,
        "successorCount": 1,
      }
    `);
  });
  test('getState -> url to appState syncing with return to a url without state', async () => {
    history.push('/#?_a=(columns:!(_source),predecessorCount:1,successorCount:1)');
    expect(state.appState.getState()).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "_source",
        ],
        "predecessorCount": 1,
        "successorCount": 1,
      }
    `);
    history.push('/');
    expect(state.appState.getState()).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "_source",
        ],
        "predecessorCount": 1,
        "successorCount": 1,
      }
    `);
  });

  test('getState -> filters', async () => {
    const filterManager = new FilterManager(setupMock.uiSettings);
    const filterGlobal = {
      query: { match: { extension: { query: 'jpg', type: 'phrase' } } },
      meta: { index: 'logstash-*', negate: false, disabled: false, alias: null },
    } as Filter;
    filterManager.setGlobalFilters([filterGlobal]);
    const filterApp = {
      query: { match: { extension: { query: 'png', type: 'phrase' } } },
      meta: { index: 'logstash-*', negate: true, disabled: false, alias: null },
    } as Filter;
    filterManager.setAppFilters([filterApp]);
    state.setFilters(filterManager);
    expect(state.getFilters()).toMatchInlineSnapshot(`
      Array [
        Object {
          "$state": Object {
            "store": "globalState",
          },
          "meta": Object {
            "alias": null,
            "disabled": false,
            "index": "logstash-*",
            "key": "extension",
            "negate": false,
            "params": Object {
              "query": "jpg",
            },
            "type": "phrase",
            "value": [Function],
          },
          "query": Object {
            "match_phrase": Object {
              "extension": Object {
                "query": "jpg",
              },
            },
          },
        },
        Object {
          "$state": Object {
            "store": "appState",
          },
          "meta": Object {
            "alias": null,
            "disabled": false,
            "index": "logstash-*",
            "key": "extension",
            "negate": true,
            "params": Object {
              "query": "png",
            },
            "type": "phrase",
            "value": [Function],
          },
          "query": Object {
            "match_phrase": Object {
              "extension": Object {
                "query": "png",
              },
            },
          },
        },
      ]
    `);
    state.flushToUrl();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!f,index:'logstash-*',key:extension,negate:!f,params:(query:jpg),type:phrase),query:(match_phrase:(extension:(query:jpg))))))&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'logstash-*',key:extension,negate:!t,params:(query:png),type:phrase),query:(match_phrase:(extension:(query:png))))),predecessorCount:4,successorCount:4)"`
    );
  });
});
