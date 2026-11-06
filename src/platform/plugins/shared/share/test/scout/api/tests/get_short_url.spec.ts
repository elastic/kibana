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

const { COMMON_HEADERS, LEGACY_SHORT_URL_LOCATOR_ID, SHORT_URL_API_PATH } = testData;

apiTest.describe('GET /api/short_url/{id}', { tag: tags.deploymentAgnostic }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForPrivilegedUser();
    headers = { ...COMMON_HEADERS, ...apiKeyHeader };
  });

  apiTest('fetches a newly created short URL', async ({ apiClient, shortUrlCleanup }) => {
    const created = await createShortUrl({
      apiClient,
      headers,
      params: {},
      track: shortUrlCleanup.track,
    });

    const response = await apiClient.get(`${SHORT_URL_API_PATH}/${created.id}`, {
      headers,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual(created);
  });

  apiTest('returns 404 when the short URL does not exist', async ({ apiClient }) => {
    const response = await apiClient.get(`${SHORT_URL_API_PATH}/missing-${randomUUID()}`, {
      headers,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'converts a legacy short URL saved object',
    async ({ apiClient, kbnClient, shortUrlCleanup }) => {
      const id = randomUUID();
      const accessDate = 1632672537546;
      const createDate = 1632672507685;
      const url = '/app/dashboards#/view/123';

      await kbnClient.savedObjects.create({
        type: 'url',
        id,
        overwrite: false,
        attributes: {
          accessCount: 25,
          accessDate,
          createDate,
          url,
        },
      });
      shortUrlCleanup.track(id);

      const response = await apiClient.get(`${SHORT_URL_API_PATH}/${id}`, {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        id,
        slug: id,
        locator: {
          id: LEGACY_SHORT_URL_LOCATOR_ID,
          version: '7.15.0',
          state: { url },
        },
        accessCount: 25,
        accessDate,
        createDate,
      });
    }
  );
});
