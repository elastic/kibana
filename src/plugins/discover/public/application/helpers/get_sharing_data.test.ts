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

import { getSharingData } from './get_sharing_data';
import { IUiSettingsClient } from 'kibana/public';
import { createSearchSourceMock } from '../../../../data/common/search/search_source/mocks';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { SORT_DEFAULT_ORDER_SETTING } from '../../../common';

describe('getSharingData', () => {
  test('returns valid data for sharing', async () => {
    const searchSourceMock = createSearchSourceMock({ index: indexPatternMock });
    const result = await getSharingData(
      searchSourceMock,
      { columns: [] },
      ({
        get: (key: string) => {
          if (key === SORT_DEFAULT_ORDER_SETTING) {
            return 'desc';
          }
          return false;
        },
      } as unknown) as IUiSettingsClient,
      () => Promise.resolve({})
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "conflictedTypesFields": Array [],
        "fields": Array [],
        "indexPatternId": "the-index-pattern-id",
        "metaFields": Array [
          "_index",
          "_score",
        ],
        "searchRequest": Object {
          "body": Object {
            "_source": Object {},
            "fields": Array [],
            "query": Object {
              "bool": Object {
                "filter": Array [],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
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
          },
          "index": "the-index-pattern-title",
        },
      }
    `);
  });
});
