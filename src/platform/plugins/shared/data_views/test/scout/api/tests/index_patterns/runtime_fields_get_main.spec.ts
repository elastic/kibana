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
  DATA_VIEW_PATH_LEGACY,
  ES_ARCHIVE_BASIC_INDEX,
  SERVICE_KEY_LEGACY,
} from '../../fixtures/constants';

apiTest.describe(
  `GET ${DATA_VIEW_PATH_LEGACY}/{id}/runtime_field/{name} - main (legacy index pattern api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let createdIds: string[] = [];

    apiTest.beforeAll(async ({ esArchiver, requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
    });

    apiTest.afterEach(async ({ apiServices }) => {
      for (const id of createdIds) {
        await apiServices.dataViews.delete(id);
      }
      createdIds = [];
    });

    apiTest('can fetch a runtime field', async ({ apiClient }) => {
      const title = `basic_index*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY_LEGACY]: {
            title,
            runtimeFieldMap: {
              runtimeFoo: {
                type: 'keyword',
                script: { source: "emit(doc['field_name'].value)" },
              },
              runtimeBar: {
                type: 'keyword',
                script: { source: "emit(doc['field_name'].value)" },
              },
            },
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      const getResponse = await apiClient.get(
        `${DATA_VIEW_PATH_LEGACY}/${id}/runtime_field/runtimeFoo`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        }
      );

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY_LEGACY]).toBeDefined();

      // The legacy endpoint returns the runtime field under a singular `field` key; the modern
      // data-view endpoint uses `fields[0]` instead.
      const field = getResponse.body.field;
      expect(typeof field).toBe('object');
      expect(field.name).toBe('runtimeFoo');
      expect(field.type).toBe('string');
      expect(field.scripted).toBe(false);
      expect(field.runtimeField.script.source).toBe("emit(doc['field_name'].value)");
    });
  }
);
