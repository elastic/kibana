/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const {
  SUGGESTIONS_VALUES_PATH,
  COMMON_HEADERS,
  ES_ARCHIVE_BASIC_INDEX,
  KBN_ARCHIVE_BASIC_KIBANA,
  VALUE_SUGGESTIONS_READER_ROLE,
} = testData;

apiTest.describe('Suggestions API - non time based', { tag: tags.deploymentAgnostic }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, esArchiver, kbnClient }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser(VALUE_SUGGESTIONS_READER_ROLE));
    await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
    await kbnClient.importExport.load(KBN_ARCHIVE_BASIC_KIBANA);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    // The Scout esArchiver fixture only ingests data (no unload), so we only
    // clean up the Kibana saved objects we imported.
    await kbnClient.importExport.unload(KBN_ARCHIVE_BASIC_KIBANA);
  });

  apiTest('returns 200 without a query', async ({ apiClient }) => {
    const response = await apiClient.post(`${SUGGESTIONS_VALUES_PATH}/basic_index`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
      body: { field: 'baz.keyword', query: '' },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toHaveLength(1);
    expect(response.body).toContain('hello');
  });

  apiTest('returns 200 without a query with method set to terms_agg', async ({ apiClient }) => {
    const response = await apiClient.post(`${SUGGESTIONS_VALUES_PATH}/basic_index`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
      body: { field: 'baz.keyword', method: 'terms_agg', query: '' },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toHaveLength(1);
    expect(response.body).toContain('hello');
  });

  apiTest('returns 200 without a query with method set to terms_enum', async ({ apiClient }) => {
    const response = await apiClient.post(`${SUGGESTIONS_VALUES_PATH}/basic_index`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
      body: { field: 'baz.keyword', method: 'terms_enum', query: '' },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toHaveLength(1);
    expect(response.body).toContain('hello');
  });

  apiTest('returns 200 with special characters', async ({ apiClient }) => {
    const response = await apiClient.post(`${SUGGESTIONS_VALUES_PATH}/basic_index`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
      body: { field: 'baz.keyword', query: '<something?with:lots&of^ bad characters' },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual([]);
  });

  apiTest('supports nested fields', async ({ apiClient }) => {
    const response = await apiClient.post(`${SUGGESTIONS_VALUES_PATH}/basic_index`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
      body: { field: 'nestedField.child', query: 'nes' },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual(['nestedValue']);
  });

  apiTest('returns 404 if index is not found', async ({ apiClient }) => {
    const response = await apiClient.post(`${SUGGESTIONS_VALUES_PATH}/not_found`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
      body: { field: 'baz.keyword', query: '1' },
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('returns 400 without a query', async ({ apiClient }) => {
    const response = await apiClient.post(`${SUGGESTIONS_VALUES_PATH}/basic_index`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
      body: { field: 'baz.keyword' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('returns 400 with a bad method', async ({ apiClient }) => {
    const response = await apiClient.post(`${SUGGESTIONS_VALUES_PATH}/basic_index`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
      body: { field: 'baz.keyword', query: '', method: 'cookie' },
    });

    expect(response).toHaveStatusCode(400);
  });
});
