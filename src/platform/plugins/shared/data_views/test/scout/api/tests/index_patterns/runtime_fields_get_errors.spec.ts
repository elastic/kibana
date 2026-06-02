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
  COMMON_HEADERS,
  ES_ARCHIVE_BASIC_INDEX,
  DATA_VIEW_PATH_LEGACY,
  ID_OVER_MAX_LENGTH,
} from '../../fixtures/constants';

apiTest.describe(
  'GET api/index_patterns/index_pattern/{id}/runtime_field/{name} - get errors (legacy index pattern api)',
  { tag: tags.deploymentAgnostic },
  () => {
    let viewerApiCredentials: RoleApiCredentials;
    let indexPatternId: string;

    apiTest.beforeAll(async ({ esArchiver, requestAuth, apiServices }) => {
      viewerApiCredentials = await requestAuth.getApiKeyForViewer();
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);

      const { data: dataView } = await apiServices.dataViews.create({
        title: '*asic_index',
      });
      indexPatternId = dataView.id;
    });

    apiTest.afterAll(async ({ apiServices }) => {
      if (indexPatternId) {
        await apiServices.dataViews.delete(indexPatternId);
      }
    });

    apiTest('returns 404 error on non-existing index pattern', async ({ apiClient }) => {
      const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
      const response = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}/runtime_field/foo`, {
        headers: {
          ...COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns 404 error on non-existing runtime field', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${DATA_VIEW_PATH_LEGACY}/${indexPatternId}/runtime_field/sf`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...viewerApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns error when ID is too long', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${DATA_VIEW_PATH_LEGACY}/${ID_OVER_MAX_LENGTH}/runtime_field/foo`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...viewerApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        '[request params.id]: value has length [1759] but it must have a maximum length of [1000].'
      );
    });
  }
);
