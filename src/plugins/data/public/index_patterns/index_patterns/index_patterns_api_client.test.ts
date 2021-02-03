/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { http } from './index_patterns_api_client.test.mock';
import { IndexPatternsApiClient } from './index_patterns_api_client';

describe('IndexPatternsApiClient', () => {
  let fetchSpy: jest.SpyInstance;
  let indexPatternsApiClient: IndexPatternsApiClient;

  beforeEach(() => {
    fetchSpy = jest.spyOn(http, 'fetch').mockImplementation(() => Promise.resolve({}));
    indexPatternsApiClient = new IndexPatternsApiClient(http);
  });

  test('uses the right URI to fetch fields for time patterns', async function () {
    const expectedPath = '/api/index_patterns/_fields_for_time_pattern';

    await indexPatternsApiClient.getFieldsForTimePattern({
      pattern: 'blah',
      metaFields: [],
      lookBack: 5,
      interval: '',
    });

    expect(fetchSpy).toHaveBeenCalledWith(expectedPath, expect.any(Object));
  });

  test('uses the right URI to fetch fields for wildcard', async function () {
    const expectedPath = '/api/index_patterns/_fields_for_wildcard';

    await indexPatternsApiClient.getFieldsForWildcard({ pattern: 'blah' });

    expect(fetchSpy).toHaveBeenCalledWith(expectedPath, expect.any(Object));
  });
});
