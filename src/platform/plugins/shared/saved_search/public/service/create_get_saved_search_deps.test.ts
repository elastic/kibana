/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { createGetSavedSearchDeps } from './create_get_saved_search_deps';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { HttpFetchError } from '@kbn/core-http-browser-internal/src/http_fetch_error';
import { getSavedSearch } from '../../common/service/get_saved_searches';

describe('createGetSavedSearchDeps', () => {
  test('should throw an error if SO not found', async () => {
    const getSavedSearchDeps = createGetSavedSearchDeps({
      search: dataPluginMock.createStartContract().search,
      contentManagement: contentManagementMock.createStartContract().client,
    });

    jest
      .spyOn(getSavedSearchDeps, 'getSavedSrch')
      .mockRejectedValue(
        new HttpFetchError(
          'Not found',
          'NotFound',
          new Request(''),
          new Response(undefined, { status: 404 })
        )
      );

    let errorMessage = 'No error thrown.';

    try {
      await getSavedSearch('ccf1af80-2297-11ec-86e0-1155ffb9c7a7', getSavedSearchDeps);
    } catch (error) {
      errorMessage = error.message;
    }

    expect(errorMessage).toBe(
      'Could not locate that Discover session (id: ccf1af80-2297-11ec-86e0-1155ffb9c7a7)'
    );
  });
});
