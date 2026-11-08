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

apiTest.describe('GET /api/short_url/_slug/{slug}', { tag: tags.deploymentAgnostic }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForPrivilegedUser();
    headers = { ...COMMON_HEADERS, ...apiKeyHeader };
  });

  apiTest('resolves a short URL by its slug', async ({ apiClient, shortUrlCleanup }) => {
    const slug = `test-slug-${randomUUID()}`;
    const created = await createShortUrl({
      apiClient,
      headers,
      params: {},
      slug,
      track: shortUrlCleanup.track,
    });

    const response = await apiClient.get(`${SHORT_URL_API_PATH}/_slug/${slug}`, {
      headers,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual(created);
  });

  apiTest('returns 404 when the slug does not exist', async ({ apiClient }) => {
    const response = await apiClient.get(`${SHORT_URL_API_PATH}/_slug/missing-${randomUUID()}`, {
      headers,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('resolves similar slugs exactly', async ({ apiClient, shortUrlCleanup }) => {
    const slugPrefix = `test-slug-${randomUUID()}`;
    const firstSlug = `${slugPrefix}.1`;
    const secondSlug = `${slugPrefix}.2`;
    const firstCreated = await createShortUrl({
      apiClient,
      headers,
      params: { url: '/path1' },
      slug: firstSlug,
      track: shortUrlCleanup.track,
    });
    const secondCreated = await createShortUrl({
      apiClient,
      headers,
      params: { url: '/path2' },
      slug: secondSlug,
      track: shortUrlCleanup.track,
    });

    const firstResponse = await apiClient.get(`${SHORT_URL_API_PATH}/_slug/${firstSlug}`, {
      headers,
      responseType: 'json',
    });
    const secondResponse = await apiClient.get(`${SHORT_URL_API_PATH}/_slug/${secondSlug}`, {
      headers,
      responseType: 'json',
    });

    expect(firstResponse).toHaveStatusCode(200);
    expect(firstResponse.body).toStrictEqual(firstCreated);
    expect(secondResponse).toHaveStatusCode(200);
    expect(secondResponse.body).toStrictEqual(secondCreated);
  });
});
