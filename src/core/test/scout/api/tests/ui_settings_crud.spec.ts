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
const TEST_SETTING = 'testSetting';

apiTest.describe('ui settings CRUD', { tag: SERVERLESS_TAGS }, () => {
  let sessionCredentials: RoleSessionCredentials;

  apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
    sessionCredentials = await samlAuth.asInteractiveUser('admin');
    await kbnClient.uiSettings.update({ [TEST_SETTING]: 100 });
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset(TEST_SETTING);
  });

  apiTest('returns list of settings', async ({ apiClient }) => {
    const response = await apiClient.get('/internal/kibana/settings', {
      headers: {
        ...INTERNAL_HEADERS,
        ...sessionCredentials.cookieHeader,
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.settings).toBeDefined();
    expect(response.body.settings[TEST_SETTING]).toBeDefined();
  });

  apiTest('set validates value', async ({ apiClient }) => {
    const response = await apiClient.post(`/internal/kibana/settings/${DEFAULT_COLUMNS_SETTING}`, {
      headers: {
        ...INTERNAL_HEADERS,
        ...sessionCredentials.cookieHeader,
      },
      body: { value: 100 },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toStrictEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: '[validation [defaultColumns]]: expected value of type [array] but got [number]',
    });
  });

  apiTest('sets value of a setting', async ({ apiClient }) => {
    const setResponse = await apiClient.post(`/internal/kibana/settings/${TEST_SETTING}`, {
      headers: {
        ...INTERNAL_HEADERS,
        ...sessionCredentials.cookieHeader,
      },
      body: { value: 999 },
    });

    expect(setResponse).toHaveStatusCode(200);

    const verifyResponse = await apiClient.get('/internal/kibana/settings', {
      headers: {
        ...INTERNAL_HEADERS,
        ...sessionCredentials.cookieHeader,
      },
    });

    expect(verifyResponse).toHaveStatusCode(200);
    expect(verifyResponse.body.settings[TEST_SETTING].userValue).toBe(999);
  });

  apiTest('set many validates value', async ({ apiClient }) => {
    const response = await apiClient.post('/internal/kibana/settings', {
      headers: {
        ...INTERNAL_HEADERS,
        ...sessionCredentials.cookieHeader,
      },
      body: { changes: { [TEST_SETTING]: 100, [DEFAULT_COLUMNS_SETTING]: 100 } },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toStrictEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: '[validation [defaultColumns]]: expected value of type [array] but got [number]',
    });
  });

  apiTest('sets values of multiple settings', async ({ apiClient }) => {
    const setResponse = await apiClient.post('/internal/kibana/settings', {
      headers: {
        ...INTERNAL_HEADERS,
        ...sessionCredentials.cookieHeader,
      },
      body: { changes: { [TEST_SETTING]: 500 } },
    });

    expect(setResponse).toHaveStatusCode(200);

    const verifyResponse = await apiClient.get('/internal/kibana/settings', {
      headers: {
        ...INTERNAL_HEADERS,
        ...sessionCredentials.cookieHeader,
      },
    });

    expect(verifyResponse).toHaveStatusCode(200);
    expect(verifyResponse.body.settings[TEST_SETTING].userValue).toBe(500);
  });

  apiTest('deletes setting', async ({ apiClient }) => {
    const deleteResponse = await apiClient.delete(`/internal/kibana/settings/${TEST_SETTING}`, {
      headers: {
        ...INTERNAL_HEADERS,
        ...sessionCredentials.cookieHeader,
      },
    });

    expect(deleteResponse).toHaveStatusCode(200);

    const verifyResponse = await apiClient.get('/internal/kibana/settings', {
      headers: {
        ...INTERNAL_HEADERS,
        ...sessionCredentials.cookieHeader,
      },
    });

    expect(verifyResponse).toHaveStatusCode(200);
    expect(verifyResponse.body.settings[TEST_SETTING]).toBeUndefined();
  });
});
