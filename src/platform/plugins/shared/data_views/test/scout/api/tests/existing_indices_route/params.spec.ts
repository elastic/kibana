/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags, type RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  ES_ARCHIVE_BASIC_INDEX,
  EXISTING_INDICES_PATH,
  INTERNAL_COMMON_HEADERS,
} from '../../fixtures/constants';

apiTest.describe(`GET /${EXISTING_INDICES_PATH} - params`, { tag: tags.deploymentAgnostic }, () => {
  let adminApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ esArchiver, requestAuth }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
    await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
  });

  apiTest('requires a query param', async ({ apiClient }) => {
    const response = await apiClient.get(EXISTING_INDICES_PATH, {
      headers: {
        ...INTERNAL_COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('accepts indices param as single index string', async ({ apiClient }) => {
    const response = await apiClient.get(`${EXISTING_INDICES_PATH}?indices=filebeat-*`, {
      headers: {
        ...INTERNAL_COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
  });

  apiTest('accepts indices param as single index array', async ({ apiClient }) => {
    const params = new URLSearchParams();
    params.append('indices', 'filebeat-*');
    const response = await apiClient.get(`${EXISTING_INDICES_PATH}?${params.toString()}`, {
      headers: {
        ...INTERNAL_COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
  });

  apiTest('accepts indices param as array', async ({ apiClient }) => {
    const params = new URLSearchParams();
    params.append('indices', 'filebeat-*');
    params.append('indices', 'packetbeat-*');
    const response = await apiClient.get(`${EXISTING_INDICES_PATH}?${params.toString()}`, {
      headers: {
        ...INTERNAL_COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
  });

  apiTest('rejects unexpected query params', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${EXISTING_INDICES_PATH}?unexpectedParam=unexpectedValue`,
      {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(400);
  });

  apiTest('rejects a comma-separated list of indices', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${EXISTING_INDICES_PATH}?indices=filebeat-*,packetbeat-*`,
      {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(400);
  });
});
