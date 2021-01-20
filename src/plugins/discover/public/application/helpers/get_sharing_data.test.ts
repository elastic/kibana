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
    const result = await getSharingData(searchSourceMock, { columns: [] }, ({
      get: (key: string) => {
        if (key === SORT_DEFAULT_ORDER_SETTING) {
          return 'desc';
        }
        return false;
      },
    } as unknown) as IUiSettingsClient);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "searchSource": Object {
          "fieldsFromSource": Array [],
          "index": "the-index-pattern-id",
        },
      }
    `);
  });
});
