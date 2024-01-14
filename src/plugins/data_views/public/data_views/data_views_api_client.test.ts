/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpSetup } from '@kbn/core/public';
import { http } from './data_views_api_client.test.mock';
import { DataViewsApiClient } from './data_views_api_client';
import { FIELDS_PATH as expectedPath } from '../../common/constants';

describe('IndexPatternsApiClient', () => {
  let fetchSpy: jest.SpyInstance;
  let indexPatternsApiClient: DataViewsApiClient;

  beforeEach(() => {
    fetchSpy = jest.spyOn(http, 'fetch').mockImplementation(() => Promise.resolve({}));
    indexPatternsApiClient = new DataViewsApiClient(http as HttpSetup, () =>
      Promise.resolve(undefined)
    );
  });

  test('uses the right URI to fetch fields for wildcard', async function () {
    await indexPatternsApiClient.getFieldsForWildcard({ pattern: 'blah', allowHidden: false });

    expect(fetchSpy).toHaveBeenCalledWith(expectedPath, {
      // not sure what asResponse is but the rest of the results are useful
      asResponse: true,
      headers: {
        'user-hash': '',
      },
      query: {
        allow_hidden: undefined,
        allow_no_index: undefined,
        apiVersion: '1', // version passed through query params for caching
        fields: undefined,
        include_unmapped: undefined,
        meta_fields: undefined,
        pattern: 'blah',
        rollup_index: undefined,
        type: undefined,
      },
      version: '1', // version header
    });
  });
});
