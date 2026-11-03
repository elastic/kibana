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

const { COMMON_HEADERS, PROXY_PATH, TEST_INDEX, INDEX_SCOPED_ROLE } = testData;

const MAX_PATH_LENGTH = 4096;

apiTest.describe('Elasticsearch proxy request validation', { tag: tags.deploymentAgnostic }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(INDEX_SCOPED_ROLE);
    headers = { ...COMMON_HEADERS, ...cookieHeader };
  });

  apiTest('requires the API version header', async ({ apiClient }) => {
    const { 'elastic-api-version': _version, ...headersWithoutVersion } = headers;

    const response = await apiClient.get(`${PROXY_PATH}/${TEST_INDEX}/_count`, {
      headers: headersWithoutVersion,
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain('elastic-api-version');
  });

  apiTest('requires the xsrf header for writes', async ({ apiClient }) => {
    const { 'kbn-xsrf': _xsrf, ...headersWithoutXsrf } = headers;

    for (const method of ['post', 'put', 'delete'] as const) {
      const response = await apiClient[method](`${PROXY_PATH}/${TEST_INDEX}/_doc/1`, {
        headers: headersWithoutXsrf,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('kbn-xsrf');
    }
  });

  apiTest('rejects Elasticsearch paths longer than the limit', async ({ apiClient }) => {
    const response = await apiClient.get(`${PROXY_PATH}/${'a'.repeat(MAX_PATH_LENGTH + 1)}`, {
      headers,
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain(`maximum length of [${MAX_PATH_LENGTH}]`);
  });
});
