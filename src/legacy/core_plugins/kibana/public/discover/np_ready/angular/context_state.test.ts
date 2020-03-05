/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { getState } from './context_state';
import { createBrowserHistory, History } from 'history';
import { FilterManager, Filter } from '../../../../../../../plugins/data/public';
import { coreMock } from '../../../../../../../core/public/mocks';
const setupMock = coreMock.createSetup();

describe('Test Discover Context State', () => {
  let history: History;
  let state: any;
  const getCurrentUrl = () => history.createHref(history.location);
  beforeEach(async () => {
    history = createBrowserHistory();
    history.push('/');
    state = await getState({
      defaultStepSize: '4',
      timeFieldName: 'time',
      history,
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
        "sort": Array [
          "time",
          "desc",
        ],
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
      `"/#?_a=(columns:!(_source),filters:!(),predecessorCount:10,sort:!(time,desc),successorCount:4)"`
    );
  });
  test('getState -> url to appState syncing', async () => {
    history.push(
      '/#?_a=(columns:!(_source),predecessorCount:1,sort:!(time,desc),successorCount:1)'
    );
    expect(state.appState.getState()).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "_source",
        ],
        "predecessorCount": 1,
        "sort": Array [
          "time",
          "desc",
        ],
        "successorCount": 1,
      }
    `);
  });
  test('getState -> url to appState syncing with return to a url without state', async () => {
    history.push(
      '/#?_a=(columns:!(_source),predecessorCount:1,sort:!(time,desc),successorCount:1)'
    );
    expect(state.appState.getState()).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "_source",
        ],
        "predecessorCount": 1,
        "sort": Array [
          "time",
          "desc",
        ],
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
        "sort": Array [
          "time",
          "desc",
        ],
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
            "match": Object {
              "extension": Object {
                "query": "jpg",
                "type": "phrase",
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
            "match": Object {
              "extension": Object {
                "query": "png",
                "type": "phrase",
              },
            },
          },
        },
      ]
    `);
    state.flushToUrl();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!f,index:'logstash-*',key:extension,negate:!f,params:(query:jpg),type:phrase),query:(match:(extension:(query:jpg,type:phrase))))))&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'logstash-*',key:extension,negate:!t,params:(query:png),type:phrase),query:(match:(extension:(query:png,type:phrase))))),predecessorCount:4,sort:!(time,desc),successorCount:4)"`
    );
  });
});
