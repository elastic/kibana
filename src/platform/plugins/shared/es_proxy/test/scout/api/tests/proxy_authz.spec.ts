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

const { COMMON_HEADERS, PROXY_PATH, FORBIDDEN_INDEX, INDEX_SCOPED_ROLE } = testData;

apiTest.describe('Elasticsearch proxy authorization', { tag: tags.deploymentAgnostic }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(INDEX_SCOPED_ROLE);
    headers = { ...COMMON_HEADERS, ...cookieHeader };
  });

  apiTest.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: FORBIDDEN_INDEX, ignore_unavailable: true });
  });

  apiTest('returns the Elasticsearch 403 for indices outside the role', async ({ apiClient }) => {
    const response = await apiClient.put(`${PROXY_PATH}/${FORBIDDEN_INDEX}/_doc/1`, {
      headers,
      body: { message: 'not allowed' },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(403);
    expect(response.body.error.type).toBe('security_exception');
  });
});
