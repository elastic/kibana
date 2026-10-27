/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS } from '../../fixtures';

const SQL_INDEX = 'search-api-sql-test';
const SQL_PATH = '/internal/search/sql';
const sqlQuery = `SELECT message, bytes FROM "${SQL_INDEX}" ORDER BY "@timestamp" DESC`;

// SQL is not supported on serverless
apiTest.describe('sql search strategy', { tag: tags.stateful.classic }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, esClient }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    headers = { ...COMMON_HEADERS, ...cookieHeader };
    await esClient.indices.delete({ index: SQL_INDEX }).catch(() => {});
    await esClient.bulk({
      refresh: 'wait_for',
      operations: Array.from({ length: 3 }, (_, i) => [
        { index: { _index: SQL_INDEX, _id: `doc-${i}` } },
        { '@timestamp': `2020-01-0${i + 1}T00:00:00.000Z`, message: `doc ${i}`, bytes: i * 100 },
      ]).flat(),
    });
  });

  apiTest.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: SQL_INDEX }).catch(() => {});
  });

  apiTest(
    'should return 200 when correctly formatted searches are provided',
    async ({ apiClient }) => {
      const response = await apiClient.post(SQL_PATH, {
        headers,
        body: { params: { query: sqlQuery } },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.isPartial).toBeDefined();
      expect(response.body.isRunning).toBeDefined();
      expect(response.body.rawResponse).toBeDefined();
      expect(response.headers[ELASTIC_HTTP_VERSION_HEADER]).toBe('1');
    }
  );

  apiTest('should fetch search results by id', async ({ apiClient }) => {
    const first = await apiClient.post(SQL_PATH, {
      headers,
      body: {
        params: {
          query: sqlQuery,
          keep_on_completion: true, // force keeping the results even if completes early
        },
      },
    });
    expect(first).toHaveStatusCode(200);
    const { id } = first.body;

    const second = await apiClient.post(`${SQL_PATH}/${id}`, { headers, body: {} });
    expect(second).toHaveStatusCode(200);
    expect(second.body.id).toBe(id);
    expect(second.body.isPartial).toBeDefined();
    expect(second.body.isRunning).toBeDefined();
    expect(second.body.rawResponse).toBeDefined();
    expect(second.headers[ELASTIC_HTTP_VERSION_HEADER]).toBe('1');
  });

  apiTest('should delete search', async ({ apiClient }) => {
    const first = await apiClient.post(SQL_PATH, {
      headers,
      body: { params: { query: sqlQuery, keep_on_completion: true } },
    });
    expect(first).toHaveStatusCode(200);
    const { id } = first.body;

    // confirm it was saved
    expect(await apiClient.post(`${SQL_PATH}/${id}`, { headers, body: {} })).toHaveStatusCode(200);

    expect(await apiClient.delete(`${SQL_PATH}/${id}`, { headers })).toHaveStatusCode(200);

    // check it was deleted
    expect(await apiClient.post(`${SQL_PATH}/${id}`, { headers, body: {} })).toHaveStatusCode(404);
  });
});
