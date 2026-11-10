/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DeprecationDetailsMessage,
  DeprecationsGetResponse,
} from '@kbn/core-deprecations-common';
import { apiTest, tags, type RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  COMMON_HEADERS,
  DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY_LEGACY,
} from '../../fixtures/constants';

const DEPRECATIONS_PATH = 'api/deprecations/';

// Scripted fields are disabled on serverless, so this only runs on stateful classic.
// The deprecations provider searches the data views of all the spaces, so the test only looks for the
// data view it creates: the "no deprecations" branch is covered by a Jest test of the provider.
apiTest.describe('scripted field deprecations', { tag: tags.stateful.classic }, () => {
  let adminApiCredentials: RoleApiCredentials;
  let createdId: string | undefined;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
  });

  apiTest.afterAll(async ({ apiServices }) => {
    if (createdId) {
      await apiServices.dataViews.delete(createdId);
    }
  });

  apiTest('scripted field deprecation', async ({ apiClient }) => {
    const title = `scripted-fields-deprecation-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
    const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
      headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
      responseType: 'json',
      body: {
        [SERVICE_KEY_LEGACY]: {
          title,
          fields: {
            foo: {
              name: 'foo',
              type: 'string',
              scripted: true,
              script: "doc['field_name'].value",
            },
            bar: {
              name: 'bar',
              type: 'number',
              scripted: true,
              script: "doc['field_name'].value",
            },
          },
        },
      },
    });
    expect(createResponse).toHaveStatusCode(200);
    createdId = createResponse.body[SERVICE_KEY_LEGACY].id;

    const response = await apiClient.get(DEPRECATIONS_PATH, {
      headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const { deprecations } = response.body as DeprecationsGetResponse;
    const dataViewsDeprecations = deprecations.filter(({ domainId }) => domainId === 'dataViews');

    expect(dataViewsDeprecations).toHaveLength(1);
    expect((dataViewsDeprecations[0].message as DeprecationDetailsMessage).content).toContain(
      title
    );
  });
});
