/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import {
  apiTest,
  COMMON_HEADERS,
  DASHBOARD_API_PATH,
  KBN_ARCHIVES,
  TEST_DASHBOARD_ID,
} from '../fixtures';

apiTest.describe('dashboards - create', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    // returns editor role in most deployment project and deployment types
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    await kbnClient.importExport.load(KBN_ARCHIVES.BASIC);
    await kbnClient.importExport.load(KBN_ARCHIVES.TAGS);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should create a dashboard', async ({ apiClient }) => {
    const title = 'Hello world dashboard';

    const response = await apiClient.post(DASHBOARD_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        data: {
          title,
        },
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.spaces).toStrictEqual(['default']);
    expect(response.body.data).toStrictEqual({
      title,
    });
  });

  apiTest('can create a dashboard with a specific id', async ({ apiClient }) => {
    const title = `foo-${Date.now()}-${Math.random()}`;
    const id = `bar-${Date.now()}-${Math.random()}`;

    const response = await apiClient.post(DASHBOARD_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        id,
        data: {
          title,
        },
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(id);
  });

  // TODO Maybe move this test to x-pack/platform/test/api_integration/dashboards
  apiTest('can create a dashboard in a defined space', async ({ apiClient }) => {
    const title = `foo-${Date.now()}-${Math.random()}`;
    const spaceId = 'space-1';

    const response = await apiClient.post(DASHBOARD_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        data: {
          title,
        },
        spaces: [spaceId],
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.spaces).toStrictEqual([spaceId]);
  });

  apiTest('return error if provided id already exists', async ({ apiClient }) => {
    const title = `foo-${Date.now()}-${Math.random()}`;

    const response = await apiClient.post(DASHBOARD_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        id: TEST_DASHBOARD_ID,
        data: {
          title,
        },
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(409);
    expect(response.body.message).toBe(`A dashboard with ID ${TEST_DASHBOARD_ID} already exists.`);
  });

  apiTest('validation - returns error when title is not provided', async ({ apiClient }) => {
    const response = await apiClient.post(DASHBOARD_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        data: {},
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe(
      '[request body.data.title]: expected value of type [string] but got [undefined]'
    );
  });

  apiTest('validation - returns error if panels is not an array', async ({ apiClient }) => {
    const response = await apiClient.post(DASHBOARD_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        data: {
          title: 'foo',
          panels: {},
        },
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe(
      '[request body.data.panels]: expected value of type [array] but got [Object]'
    );
  });
});
