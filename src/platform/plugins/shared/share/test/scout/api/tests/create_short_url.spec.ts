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
import type { SerializableRecord } from '@kbn/utility-types';
import { apiTest, testData, type ShortUrlApiResponse } from '../fixtures';

const { COMMON_HEADERS, LEGACY_SHORT_URL_LOCATOR_ID, SHORT_URL_API_PATH } = testData;

const expectCreatedShortUrl = (
  shortUrl: ShortUrlApiResponse,
  locatorState: SerializableRecord
): void => {
  expect(typeof shortUrl.id).toBe('string');
  expect(typeof shortUrl.slug).toBe('string');
  expect(shortUrl.accessCount).toBe(0);
  expect(typeof shortUrl.accessDate).toBe('number');
  expect(typeof shortUrl.createDate).toBe('number');
  expect(shortUrl.locator.id).toBe(LEGACY_SHORT_URL_LOCATOR_ID);
  expect(typeof shortUrl.locator.version).toBe('string');
  expect(shortUrl.locator.state).toStrictEqual(locatorState);
  expect(shortUrl.url).toBe('');
};

apiTest.describe('POST /api/short_url', { tag: tags.deploymentAgnostic }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForPrivilegedUser();
    headers = { ...COMMON_HEADERS, ...apiKeyHeader };
  });

  apiTest('creates a short URL with locator data only', async ({ apiClient, shortUrlCleanup }) => {
    const response = await apiClient.post(SHORT_URL_API_PATH, {
      headers,
      responseType: 'json',
      body: {
        locatorId: LEGACY_SHORT_URL_LOCATOR_ID,
        params: {},
      },
    });

    expect(response).toHaveStatusCode(200);
    const shortUrl = response.body as ShortUrlApiResponse;
    shortUrlCleanup.track(shortUrl.id);
    expectCreatedShortUrl(shortUrl, {});
    expect(shortUrl.slug.length).toBeGreaterThanOrEqual(4);
  });

  apiTest('creates a short URL with locator params', async ({ apiClient, shortUrlCleanup }) => {
    const params = { url: '/foo/bar' };
    const response = await apiClient.post(SHORT_URL_API_PATH, {
      headers,
      responseType: 'json',
      body: {
        locatorId: LEGACY_SHORT_URL_LOCATOR_ID,
        params,
      },
    });

    expect(response).toHaveStatusCode(200);
    const shortUrl = response.body as ShortUrlApiResponse;
    shortUrlCleanup.track(shortUrl.id);
    expectCreatedShortUrl(shortUrl, params);
  });

  apiTest('creates a short URL with a custom slug', async ({ apiClient, shortUrlCleanup }) => {
    const slug = `test-slug-${randomUUID()}`;
    const params = { url: '/foo/bar' };
    const response = await apiClient.post(SHORT_URL_API_PATH, {
      headers,
      responseType: 'json',
      body: {
        locatorId: LEGACY_SHORT_URL_LOCATOR_ID,
        params,
        slug,
      },
    });

    expect(response).toHaveStatusCode(200);
    const shortUrl = response.body as ShortUrlApiResponse;
    shortUrlCleanup.track(shortUrl.id);
    expectCreatedShortUrl(shortUrl, params);
    expect(shortUrl.slug).toBe(slug);
  });

  apiTest('returns 400 when the slug contains invalid characters', async ({ apiClient }) => {
    const response = await apiClient.post(SHORT_URL_API_PATH, {
      headers,
      responseType: 'json',
      body: {
        locatorId: LEGACY_SHORT_URL_LOCATOR_ID,
        params: {},
        slug: 'pipe|is-not-allowed',
      },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe('Invalid [slug = pipe|is-not-allowed].');
  });

  apiTest('returns 409 when the slug already exists', async ({ apiClient, shortUrlCleanup }) => {
    const slug = `test-slug-${randomUUID()}`;
    const request = () =>
      apiClient.post(SHORT_URL_API_PATH, {
        headers,
        responseType: 'json',
        body: {
          locatorId: LEGACY_SHORT_URL_LOCATOR_ID,
          params: { url: '/foo/bar' },
          slug,
        },
      });

    const createResponse = await request();
    expect(createResponse).toHaveStatusCode(200);
    shortUrlCleanup.track((createResponse.body as ShortUrlApiResponse).id);

    expect(await request()).toHaveStatusCode(409);
  });
});
