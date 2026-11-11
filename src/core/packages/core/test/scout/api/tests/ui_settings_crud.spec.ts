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
  ...tags.serverless.vectordb,
];

const DEFAULT_COLUMNS_SETTING = 'defaultColumns';
const TEST_SETTING = 'testSetting';
const TEST_SETTING_VALUE = 100;
// Several times the 10s uiSettings cache TTL, which a write only invalidates on the node serving it.
const SETTINGS_PROPAGATION_TIMEOUT = 30_000;

apiTest.describe('ui settings CRUD', { tag: SERVERLESS_TAGS }, () => {
  let sessionCredentials: RoleSessionCredentials;

  apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
    sessionCredentials = await samlAuth.asInteractiveUser('admin');
    await kbnClient.uiSettings.update({ [TEST_SETTING]: TEST_SETTING_VALUE });
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset(TEST_SETTING);
  });

  apiTest('returns list of settings', async ({ apiClient }) => {
    await expect
      .poll(
        async () => {
          const response = await apiClient.get('/internal/kibana/settings', {
            headers: {
              ...INTERNAL_HEADERS,
              ...sessionCredentials.cookieHeader,
            },
          });

          return {
            statusCode: response.statusCode,
            userValue: response.body.settings?.[TEST_SETTING]?.userValue,
          };
        },
        { timeout: SETTINGS_PROPAGATION_TIMEOUT, intervals: [1_000] }
      )
      .toStrictEqual({ statusCode: 200, userValue: TEST_SETTING_VALUE });
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
    expect(setResponse.body.settings[TEST_SETTING].userValue).toBe(999);
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
    expect(setResponse.body.settings[TEST_SETTING].userValue).toBe(500);
  });

  apiTest('deletes setting', async ({ apiClient }) => {
    const deleteResponse = await apiClient.delete(`/internal/kibana/settings/${TEST_SETTING}`, {
      headers: {
        ...INTERNAL_HEADERS,
        ...sessionCredentials.cookieHeader,
      },
    });

    expect(deleteResponse).toHaveStatusCode(200);
    expect(deleteResponse.body.settings[TEST_SETTING]).toBeUndefined();
  });
});
