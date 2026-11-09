/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, createShortUrl, testData } from '../fixtures';

const { COMMON_HEADERS, SHORT_URL_API_PATH } = testData;

apiTest.describe('DELETE /api/short_url/{id}', { tag: tags.deploymentAgnostic }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForPrivilegedUser();
    headers = { ...COMMON_HEADERS, ...apiKeyHeader };
  });

  apiTest('deletes a short URL', async ({ apiClient, shortUrlCleanup }) => {
    const created = await createShortUrl({
      apiClient,
      headers,
      params: {},
      track: shortUrlCleanup.track,
    });

    const getResponse = await apiClient.get(`${SHORT_URL_API_PATH}/${created.id}`, {
      headers,
      responseType: 'json',
    });
    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body).toStrictEqual(created);

    const deleteResponse = await apiClient.delete(`${SHORT_URL_API_PATH}/${created.id}`, {
      headers,
      responseType: 'json',
    });
    expect(deleteResponse).toHaveStatusCode(200);
    expect(deleteResponse.body).toBeNull();

    const deletedGetResponse = await apiClient.get(`${SHORT_URL_API_PATH}/${created.id}`, {
      headers,
      responseType: 'json',
    });
    expect(deletedGetResponse).toHaveStatusCode(404);
  });

  apiTest(
    'returns 404 when deleting an already deleted short URL',
    async ({ apiClient, shortUrlCleanup }) => {
      const created = await createShortUrl({
        apiClient,
        headers,
        params: {},
        track: shortUrlCleanup.track,
      });

      const deleteResponse = await apiClient.delete(`${SHORT_URL_API_PATH}/${created.id}`, {
        headers,
        responseType: 'json',
      });
      expect(deleteResponse).toHaveStatusCode(200);

      const repeatedDeleteResponse = await apiClient.delete(`${SHORT_URL_API_PATH}/${created.id}`, {
        headers,
        responseType: 'json',
      });
      expect(repeatedDeleteResponse).toHaveStatusCode(404);
    }
  );

  apiTest('returns 404 when deleting a short URL that does not exist', async ({ apiClient }) => {
    const response = await apiClient.delete(`${SHORT_URL_API_PATH}/missing-${randomUUID()}`, {
      headers,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });
});
