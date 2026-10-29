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
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { getErrorCodeFromErrorReason } from '../../../../public/lib/runtime_field_validation';
import { FIELD_PREVIEW_PATH, INITIAL_REST_VERSION } from '../../../../common/constants';
import { apiTest } from '../fixtures';

const INDEX_NAME = 'api-integration-test-field-preview';

const COMMON_HEADERS: Record<string, string> = {
  [ELASTIC_HTTP_VERSION_HEADER]: INITIAL_REST_VERSION,
  'x-elastic-internal-origin': 'kibana',
  'kbn-xsrf': 'scout',
};

const DOCUMENT = { foo: 1, bar: 'hello' };

const SCRIPT_VALUE_CASES = [
  { context: 'keyword_field', source: 'emit("test")', expected: 'test' },
  { context: 'long_field', source: 'emit(doc["foo"].value + 1)', expected: 2 },
  {
    context: 'keyword_field',
    source: 'emit(doc["bar"].value + " world")',
    expected: 'hello world',
  },
] as const;

apiTest.describe('Field preview', { tag: tags.deploymentAgnostic }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ esClient, samlAuth }) => {
    // The route relies on Elasticsearch privileges, so the user needs access to the test index.
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    headers = { ...COMMON_HEADERS, ...cookieHeader };

    await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
    await esClient.indices.create({
      index: INDEX_NAME,
      mappings: { properties: { foo: { type: 'integer' }, bar: { type: 'keyword' } } },
    });
  });

  apiTest.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
  });

  for (const { context, source, expected } of SCRIPT_VALUE_CASES) {
    apiTest(`should return the script value > ${context}: ${source}`, async ({ apiClient }) => {
      const response = await apiClient.post(FIELD_PREVIEW_PATH, {
        headers,
        body: { script: { source }, document: DOCUMENT, context, index: INDEX_NAME },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.values).toStrictEqual([expected]);
    });
  }

  apiTest('should require a script', async ({ apiClient }) => {
    const response = await apiClient.post(FIELD_PREVIEW_PATH, {
      headers,
      body: { context: 'keyword_field', index: INDEX_NAME },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('should require a context', async ({ apiClient }) => {
    const response = await apiClient.post(FIELD_PREVIEW_PATH, {
      headers,
      body: { script: { source: 'emit("hello")' }, index: INDEX_NAME },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('should require an index', async ({ apiClient }) => {
    const response = await apiClient.post(FIELD_PREVIEW_PATH, {
      headers,
      body: { script: { source: 'emit("hello")' }, context: 'keyword_field' },
    });

    expect(response).toHaveStatusCode(400);
  });

  // ES does not return error codes, so this test pins the error message wording that
  // "getErrorCodeFromErrorReason()" relies on. If it fails, update that handler.
  apiTest('should detect a script casting error', async ({ apiClient }) => {
    const response = await apiClient.post(FIELD_PREVIEW_PATH, {
      headers,
      // A long is emitted but the type is "keyword"
      body: { script: { source: 'emit(123)' }, context: 'keyword_field', index: INDEX_NAME },
    });

    expect(getErrorCodeFromErrorReason(response.body.error?.caused_by?.reason)).toBe('CAST_ERROR');
  });
});
