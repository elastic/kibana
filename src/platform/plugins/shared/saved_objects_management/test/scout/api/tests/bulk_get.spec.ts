/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { KBN_ARCHIVES, MANAGEMENT_API, SAVED_OBJECT_IDS } = testData;

const validObject = { type: 'visualization', id: SAVED_OBJECT_IDS.VISUALIZATION };
const invalidObject = { type: 'wigwags', id: 'foo' };

apiTest.describe('_bulk_get', { tag: tags.deploymentAgnostic }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
    adminCredentials = await requestAuth.getApiKey('viewer');
    await kbnClient.importExport.load(KBN_ARCHIVES.BASIC);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVES.BASIC);
  });

  apiTest('should return 200 for object that exists and inject metadata', async ({ apiClient }) => {
    const response = await apiClient.post(MANAGEMENT_API.BULK_GET, {
      headers: {
        ...adminCredentials.apiKeyHeader,
        ...testData.COMMON_HEADERS,
      },
      body: [validObject],
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].type).toBe(validObject.type);
    expect(response.body[0].id).toBe(validObject.id);
    expect(response.body[0].meta).toBeDefined();
    expect(response.body[0].error).toBeUndefined();
  });

  apiTest('should return error for invalid object type', async ({ apiClient }) => {
    const response = await apiClient.post(MANAGEMENT_API.BULK_GET, {
      headers: {
        ...adminCredentials.apiKeyHeader,
        ...testData.COMMON_HEADERS,
      },
      body: [invalidObject],
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].type).toBe(invalidObject.type);
    expect(response.body[0].id).toBe(invalidObject.id);
    expect(response.body[0].error).toStrictEqual({
      message: `Unsupported saved object type: '${invalidObject.type}': Bad Request`,
      statusCode: 400,
      error: 'Bad Request',
    });
  });

  apiTest('should return mix of successes and errors', async ({ apiClient }) => {
    const response = await apiClient.post(MANAGEMENT_API.BULK_GET, {
      headers: {
        ...adminCredentials.apiKeyHeader,
        ...testData.COMMON_HEADERS,
      },
      body: [validObject, invalidObject],
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toHaveLength(2);

    expect(response.body[0].type).toBe(validObject.type);
    expect(response.body[0].id).toBe(validObject.id);
    expect(response.body[0].meta).toBeDefined();
    expect(response.body[0].error).toBeUndefined();

    expect(response.body[1].type).toBe(invalidObject.type);
    expect(response.body[1].id).toBe(invalidObject.id);
    expect(response.body[1].error).toStrictEqual({
      message: `Unsupported saved object type: '${invalidObject.type}': Bad Request`,
      statusCode: 400,
      error: 'Bad Request',
    });
  });
});
