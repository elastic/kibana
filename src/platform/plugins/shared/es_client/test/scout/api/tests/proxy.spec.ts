/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { gzipSync } from 'zlib';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { COMMON_HEADERS, PROXY_PATH, TEST_INDEX, INDEX_SCOPED_ROLE } = testData;

apiTest.describe('Elasticsearch proxy', { tag: tags.deploymentAgnostic }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(INDEX_SCOPED_ROLE);
    headers = { ...COMMON_HEADERS, ...cookieHeader };
  });

  apiTest.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: TEST_INDEX, ignore_unavailable: true });
  });

  apiTest('creates and searches documents through the proxy', async ({ apiClient }) => {
    const createResponse = await apiClient.put(
      `${PROXY_PATH}/${TEST_INDEX}/_create/1?refresh=true`,
      { headers, body: { message: 'hello proxy' }, responseType: 'json' }
    );
    expect(createResponse).toHaveStatusCode(201);
    expect(createResponse.body).toMatchObject({ _index: TEST_INDEX, _id: '1', result: 'created' });
    expect(createResponse.headers.location).toBe(`/${PROXY_PATH}/${TEST_INDEX}/_doc/1`);

    const searchResponse = await apiClient.post(`${PROXY_PATH}/${TEST_INDEX}/_search`, {
      headers,
      body: { query: { match: { message: 'hello' } } },
      responseType: 'json',
    });
    expect(searchResponse).toHaveStatusCode(200);
    expect(searchResponse.body.hits.total.value).toBe(1);
  });

  apiTest('accepts gzip-compressed ndjson bulk bodies', async ({ apiClient }) => {
    const ndjson = `{"index":{"_id":"gz"}}\n{"message":"compressed"}\n`;
    const response = await apiClient.post(`${PROXY_PATH}/${TEST_INDEX}/_bulk?refresh=true`, {
      headers: {
        ...headers,
        'Content-Type': 'application/x-ndjson',
        'Content-Encoding': 'gzip',
      },
      body: gzipSync(ndjson),
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.errors).toBe(false);
    expect(response.body.items[0].index.result).toBe('created');
  });

  apiTest('keeps percent-encoded characters in document ids', async ({ apiClient }) => {
    const createResponse = await apiClient.put(
      `${PROXY_PATH}/${TEST_INDEX}/_doc/a%2Fb?refresh=true`,
      { headers, body: { message: 'slash id' }, responseType: 'json' }
    );
    expect(createResponse).toHaveStatusCode(201);

    const getResponse = await apiClient.get(`${PROXY_PATH}/${TEST_INDEX}/_doc/a%2Fb`, {
      headers,
      responseType: 'json',
    });
    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body._id).toBe('a/b');
  });

  apiTest('answers HEAD requests', async ({ apiClient }) => {
    const existing = await apiClient.head(`${PROXY_PATH}/${TEST_INDEX}`, { headers });
    expect(existing).toHaveStatusCode(200);

    const missing = await apiClient.head(`${PROXY_PATH}/${TEST_INDEX}-missing`, { headers });
    expect(missing).toHaveStatusCode(404);
  });

  apiTest('passes Elasticsearch errors through unchanged', async ({ apiClient }) => {
    const response = await apiClient.get(`${PROXY_PATH}/${TEST_INDEX}-missing/_doc/1`, {
      headers,
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(404);
    expect(response.body.error.type).toBe('index_not_found_exception');
  });

  apiTest('returns async ES|QL ids in headers for non-JSON formats', async ({ apiClient }) => {
    const response = await apiClient.post(`${PROXY_PATH}/_query/async?format=csv`, {
      headers,
      body: { query: `FROM ${TEST_INDEX} | LIMIT 1`, keep_on_completion: true },
      responseType: 'text',
    });
    expect(response).toHaveStatusCode(200);
    const asyncId = response.headers['x-elasticsearch-async-id'];
    expect(asyncId).toMatch(/\S+/);
    expect(response.headers['x-elasticsearch-async-is-running']).toBe('?0');

    const deleteResponse = await apiClient.delete(`${PROXY_PATH}/_query/async/${asyncId}`, {
      headers,
      responseType: 'json',
    });
    expect(deleteResponse).toHaveStatusCode(200);
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
    const catPath = `${PROXY_PATH}/_cat/count/${TEST_INDEX}?h=count`;

    const textResponse = await apiClient.get(catPath, { headers, responseType: 'text' });
    expect(textResponse).toHaveStatusCode(200);
    expect(textResponse.headers['content-type']).toMatch(/^text\/plain/);
    expect(textResponse.body.trim()).toMatch(/^\d+$/);

    const jsonResponse = await apiClient.get(catPath, {
      headers: { ...headers, accept: 'application/json' },
      responseType: 'json',
    });
    expect(jsonResponse).toHaveStatusCode(200);
    expect(jsonResponse.headers['content-type']).toMatch(/^application\/json/);
    expect(jsonResponse.body).toStrictEqual([{ count: textResponse.body.trim() }]);
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
    const response = await apiClient.delete(`${PROXY_PATH}/${TEST_INDEX}/_doc/1`, {
      headers,
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.result).toBe('deleted');
  });
});
