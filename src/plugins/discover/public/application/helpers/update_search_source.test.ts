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

import { updateSearchSource } from './update_search_source';
import { createSearchSourceMock } from '../../../../data/common/search/search_source/mocks';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { AppState } from '../angular/discover_state';
import { IUiSettingsClient } from 'kibana/public';
import { DiscoverServices } from '../../build_services';
import { dataPluginMock } from '../../../../data/public/mocks';
import { SAMPLE_SIZE_SETTING } from '../../../common';

describe('updateSearchSource', () => {
  test('updates a given search source', async () => {
    const searchSourceMock = createSearchSourceMock({});
    const result = updateSearchSource(searchSourceMock, {
      indexPattern: indexPatternMock,
      services: ({
        data: dataPluginMock.createStartContract(),
        uiSettings: ({
          get: (key: string) => {
            if (key === SAMPLE_SIZE_SETTING) {
              return 500;
            }
            return false;
          },
        } as unknown) as IUiSettingsClient,
      } as unknown) as DiscoverServices,
      state: ({ sort: [] } as unknown) as AppState,
    });
    expect(result).toMatchInlineSnapshot(`
      SearchSource {
        "dependencies": Object {
          "getConfig": [MockFunction],
          "legacy": Object {
            "callMsearch": [MockFunction],
            "loadingCount$": BehaviorSubject {
              "_isScalar": false,
              "_value": 0,
              "closed": false,
              "hasError": false,
              "isStopped": false,
              "observers": Array [],
              "thrownError": null,
            },
          },
          "onResponse": [MockFunction],
          "search": [MockFunction],
        },
        "fields": Object {
          "index": Object {
            "fields": Array [
              Object {
                "filterable": true,
                "name": "_index",
                "scripted": false,
                "type": "string",
              },
              Object {
                "filterable": false,
                "name": "message",
                "scripted": false,
                "type": "string",
              },
              Object {
                "filterable": true,
                "name": "extension",
                "scripted": false,
                "type": "string",
              },
              Object {
                "filterable": true,
                "name": "bytes",
                "scripted": false,
                "type": "number",
              },
              Object {
                "filterable": false,
                "name": "scripted",
                "scripted": true,
                "type": "number",
              },
            ],
            "flattenHit": [Function],
            "formatHit": [MockFunction],
            "getComputedFields": [Function],
            "getFieldByName": [Function],
            "getSourceFiltering": [Function],
            "id": "the-index-pattern-id",
            "metaFields": Array [
              "_index",
              "_score",
            ],
            "title": "the-index-pattern-title",
          },
          "size": 500,
          "sort": Array [],
        },
        "history": Array [],
        "id": "data_source1",
        "inheritOptions": Object {},
        "parent": undefined,
        "requestStartHandlers": Array [],
        "searchStrategyId": undefined,
      }
    `);
  });
});
