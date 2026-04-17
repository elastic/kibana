/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/api';
import { apiTest, tags } from '@kbn/scout';
import type { RoleSessionCredentials } from '@kbn/scout';
import { INTERNAL_HEADERS } from '../fixtures';

const SERVERLESS_TAGS = [
  ...tags.serverless.search,
  ...tags.serverless.observability.complete,
  ...tags.serverless.security.complete,
  ...tags.serverless.workplaceai,
];

const DEFAULT_COLUMNS_SETTING = 'defaultColumns';

apiTest.describe('ui settings validate', { tag: SERVERLESS_TAGS }, () => {
  let sessionCredentials: RoleSessionCredentials;

  apiTest.beforeAll(async ({ samlAuth }) => {
    sessionCredentials = await samlAuth.asInteractiveUser('viewer');
  });

  apiTest('returns validation error for invalid value', async ({ apiClient }) => {
    const response = await apiClient.post(
      `/internal/kibana/settings/${DEFAULT_COLUMNS_SETTING}/validate`,
      {
        headers: {
          ...INTERNAL_HEADERS,
          ...sessionCredentials.cookieHeader,
        },
        body: { value: 100 },
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      valid: false,
      errorMessage: 'expected value of type [array] but got [number]',
    });
  });

  apiTest('returns no error for valid value', async ({ apiClient }) => {
    const response = await apiClient.post(
      `/internal/kibana/settings/${DEFAULT_COLUMNS_SETTING}/validate`,
      {
        headers: {
          ...INTERNAL_HEADERS,
          ...sessionCredentials.cookieHeader,
        },
        body: { value: ['test'] },
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      valid: true,
    });
  });

  apiTest('returns 404 for non-existing key', async ({ apiClient }) => {
    const response = await apiClient.post(`/internal/kibana/settings/nonExisting/validate`, {
      headers: {
        ...INTERNAL_HEADERS,
        ...sessionCredentials.cookieHeader,
      },
      body: { value: ['test'] },
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body).toStrictEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Setting with a key [nonExisting] does not exist.',
    });
  });

  apiTest('returns 400 for null value', async ({ apiClient }) => {
    const response = await apiClient.post(
      `/internal/kibana/settings/${DEFAULT_COLUMNS_SETTING}/validate`,
      {
        headers: {
          ...INTERNAL_HEADERS,
          ...sessionCredentials.cookieHeader,
        },
        body: { value: null },
      }
    );

    expect(response).toHaveStatusCode(400);
    expect(response.body).toStrictEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'No value was specified.',
    });
  });
});
