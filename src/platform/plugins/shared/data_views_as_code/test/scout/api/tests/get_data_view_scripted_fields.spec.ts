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
import { BASE_PATH, COMMON_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'GET /api/data_views/v2/{id} - as code - scripted fields',
  // Scripted fields are only enabled on stateful, they are hidden on serverless by default.
  { tag: tags.stateful.classic },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    const SCRIPTED_FIELD_NAME = 'double_bytes';
    const SCRIPTED_FIELD_SCRIPT = "doc['bytes'].value * 2";
    const SCRIPTED_DATA_VIEW = {
      title: 'some-scripted-index-pattern-*',
      id: `data-view-scripted-${Date.now()}-${Math.random()}`,
      fieldFormats: {
        [SCRIPTED_FIELD_NAME]: { id: 'bytes', params: { pattern: '0,0.0b' } },
      },
      fieldAttrs: {
        [SCRIPTED_FIELD_NAME]: {
          customLabel: 'Double bytes',
          customDescription: 'The bytes, twice',
          count: 3,
        },
      },
    };

    apiTest.beforeAll(async ({ requestAuth, apiClient, apiServices }) => {
      adminApiCredentials = await requestAuth.getApiKeyForAdmin();
      await apiServices.dataViews.create(SCRIPTED_DATA_VIEW);

      // Scripted fields are deprecated and can only be created through the legacy data views API.
      const response = await apiClient.post(
        `/api/index_patterns/index_pattern/${SCRIPTED_DATA_VIEW.id}/scripted_field`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            field: {
              name: SCRIPTED_FIELD_NAME,
              type: 'number',
              scripted: true,
              lang: 'painless',
              script: SCRIPTED_FIELD_SCRIPT,
            },
          },
        }
      );
      expect(response).toHaveStatusCode(200);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.dataViews.delete(SCRIPTED_DATA_VIEW.id);
    });

    apiTest(
      'returns the scripted fields with their label, description, format and popularity',
      async ({ apiClient }) => {
        const response = await apiClient.get(`${BASE_PATH}/${SCRIPTED_DATA_VIEW.id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.data.scripted_fields).toStrictEqual({
          [SCRIPTED_FIELD_NAME]: {
            type: 'number',
            script: SCRIPTED_FIELD_SCRIPT,
            custom_label: 'Double bytes',
            custom_description: 'The bytes, twice',
            format: { type: 'bytes', params: { pattern: '0,0.0b' } },
            popularity: 3,
          },
        });
      }
    );

    apiTest('does not repeat scripted fields in field_settings', async ({ apiClient }) => {
      const response = await apiClient.get(`${BASE_PATH}/${SCRIPTED_DATA_VIEW.id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.data.field_settings?.[SCRIPTED_FIELD_NAME]).toBeUndefined();
    });
  }
);
