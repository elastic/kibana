/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import { gzipSync } from 'zlib';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { COMMON_HEADERS, PROXY_PATH, TEST_INDEX, INDEX_SCOPED_ROLE } = testData;

const CREATED_INDEX = `${TEST_INDEX}-created-${randomUUID()}`;
const MISSING_INDEX = `${TEST_INDEX}-missing`;

apiTest.describe('Elasticsearch proxy', { tag: tags.deploymentAgnostic }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(INDEX_SCOPED_ROLE);
    headers = { ...COMMON_HEADERS, ...cookieHeader };
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await esClient.indices.delete({ index: [TEST_INDEX, CREATED_INDEX], ignore_unavailable: true });
    await esClient.indices.create({
      index: TEST_INDEX,
      mappings: { properties: { message: { type: 'text' } } },
    });
  });

  apiTest.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: [TEST_INDEX, CREATED_INDEX], ignore_unavailable: true });
  });

  apiTest('creates an index and reads its mapping through the proxy', async ({ apiClient }) => {
    const createResponse = await apiClient.put(`${PROXY_PATH}/${CREATED_INDEX}`, {
      headers,
      body: { mappings: { properties: { tag: { type: 'keyword' } } } },
      responseType: 'json',
    });
    expect(createResponse).toHaveStatusCode(200);
    expect(createResponse.body).toMatchObject({ acknowledged: true, index: CREATED_INDEX });

    const mappingResponse = await apiClient.get(`${PROXY_PATH}/${CREATED_INDEX}/_mapping`, {
      headers,
      responseType: 'json',
    });
    expect(mappingResponse).toHaveStatusCode(200);
    expect(mappingResponse.body[CREATED_INDEX].mappings.properties.tag.type).toBe('keyword');
  });

  apiTest('serves the document and count APIs', async ({ apiClient }) => {
    const docPath = `${PROXY_PATH}/${TEST_INDEX}/_doc/a%2Fb`;

    const indexResponse = await apiClient.put(`${docPath}?refresh=true`, {
      headers,
      body: { message: 'slash id' },
      responseType: 'json',
    });
    expect(indexResponse).toHaveStatusCode(201);

    const getResponse = await apiClient.get(docPath, { headers, responseType: 'json' });
    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body._id).toBe('a/b');

    const countResponse = await apiClient.get(`${PROXY_PATH}/${TEST_INDEX}/_count`, {
      headers,
      responseType: 'json',
    });
    expect(countResponse).toHaveStatusCode(200);
    expect(countResponse.body.count).toBe(1);

    const deleteResponse = await apiClient.delete(docPath, { headers, responseType: 'json' });
    expect(deleteResponse).toHaveStatusCode(200);
    expect(deleteResponse.body.result).toBe('deleted');
  });

  apiTest('accepts gzip-compressed bodies', async ({ apiClient }) => {
    const response = await apiClient.put(`${PROXY_PATH}/${TEST_INDEX}/_mapping`, {
      // The API client JSON-serializes Buffer bodies sent as `application/json`, so use YAML.
      headers: { ...headers, 'Content-Type': 'application/yaml', 'Content-Encoding': 'gzip' },
      body: gzipSync('properties:\n  tag:\n    type: keyword\n'),
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.acknowledged).toBe(true);
  });

  apiTest('keeps percent-encoded index lists', async ({ apiClient }) => {
    const indexList = encodeURIComponent(`${TEST_INDEX},${MISSING_INDEX}`);
    const response = await apiClient.get(
      `${PROXY_PATH}/${indexList}/_mapping?ignore_unavailable=true`,
      { headers, responseType: 'json' }
    );
    expect(response).toHaveStatusCode(200);
    expect(Object.keys(response.body)).toStrictEqual([TEST_INDEX]);
  });

  apiTest('answers HEAD requests', async ({ apiClient }) => {
    const existing = await apiClient.head(`${PROXY_PATH}/${TEST_INDEX}`, { headers });
    expect(existing).toHaveStatusCode(200);
    // The browser client must not parse HEAD responses as JSON despite this content type.
    expect(existing.headers['content-type']).toMatch(/^application\/json/);

    const missing = await apiClient.head(`${PROXY_PATH}/${MISSING_INDEX}`, { headers });
    expect(missing).toHaveStatusCode(404);
  });

  apiTest('passes Elasticsearch errors through unchanged', async ({ apiClient }) => {
    const response = await apiClient.get(`${PROXY_PATH}/${MISSING_INDEX}/_mapping`, {
      headers,
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(404);
    expect(response.body.error.type).toBe('index_not_found_exception');
  });

  apiTest('forwards the query string', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${PROXY_PATH}/${TEST_INDEX}/_mapping?filter_path=*.mappings.properties.message.type`,
      { headers, responseType: 'json' }
    );
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      [TEST_INDEX]: { mappings: { properties: { message: { type: 'text' } } } },
    });
  });

  apiTest('forwards the accept header and returns the content type', async ({ apiClient }) => {
    const response = await apiClient.get(`${PROXY_PATH}/${TEST_INDEX}/_mapping`, {
      headers: { ...headers, accept: 'application/yaml' },
      responseType: 'text',
    });
    expect(response).toHaveStatusCode(200);
    expect(response.headers['content-type']).toMatch(/^application\/yaml/);
    expect(response.body).toContain(`${TEST_INDEX}:`);
  });

  apiTest('forwards POST requests without a body', async ({ apiClient }) => {
    const response = await apiClient.post(`${PROXY_PATH}/${TEST_INDEX}/_refresh`, {
      headers,
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body._shards.failed).toBe(0);
  });

  apiTest('forwards DELETE requests', async ({ apiClient }) => {
    const response = await apiClient.delete(`${PROXY_PATH}/${TEST_INDEX}`, {
      headers,
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.acknowledged).toBe(true);
  });

  for (const [name, path] of [
    ['blocked security APIs', '_security/_authenticate'],
    ['blocked APIs regardless of case and encoding', '%5FSECURITY/_authenticate'],
    ['APIs missing from the allowlist', `${TEST_INDEX}/_search`],
    ['the Elasticsearch root', ''],
  ]) {
    apiTest(`rejects ${name} without calling Elasticsearch`, async ({ apiClient }) => {
      const response = await apiClient.get(`${PROXY_PATH}/${path}`, {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toContain('is not available through this proxy');
    });
  }
});
