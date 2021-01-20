/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
