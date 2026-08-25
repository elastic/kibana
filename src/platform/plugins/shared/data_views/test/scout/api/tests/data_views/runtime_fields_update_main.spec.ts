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
  DATA_VIEW_PATH,
  ES_ARCHIVE_BASIC_INDEX,
  SERVICE_KEY,
} from '../../fixtures/constants';

apiTest.describe(
  `POST ${DATA_VIEW_PATH}/{id}/runtime_field/{name} - update main (data view api)`,
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

    apiTest(
      'can update an existing runtime field and do a partial update',
      async ({ apiClient }) => {
        const createResponse = await apiClient.post(DATA_VIEW_PATH, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: {
            override: true,
            [SERVICE_KEY]: {
              title: 'basic_index',
              runtimeFieldMap: {
                runtimeFoo: {
                  type: 'keyword',
                  script: { source: "doc['field_name'].value" },
                },
                runtimeBar: {
                  type: 'keyword',
                  script: { source: "doc['field_name'].value" },
                },
              },
            },
          },
        });

        expect(createResponse).toHaveStatusCode(200);
        const id = createResponse.body[SERVICE_KEY].id;
        createdIds.push(id);

        await apiTest.step('full update of runtimeFoo', async () => {
          const updateResponse = await apiClient.post(
            `${DATA_VIEW_PATH}/${id}/runtime_field/runtimeFoo`,
            {
              headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
              responseType: 'json',
              body: {
                runtimeField: {
                  type: 'keyword',
                  script: { source: "doc['something_new'].value" },
                },
              },
            }
          );
          expect(updateResponse).toHaveStatusCode(200);

          const getResponse = await apiClient.get(
            `${DATA_VIEW_PATH}/${id}/runtime_field/runtimeFoo`,
            {
              headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
              responseType: 'json',
            }
          );
          expect(getResponse).toHaveStatusCode(200);
          expect(getResponse.body[SERVICE_KEY]).toBeDefined();

          const field = getResponse.body.fields[0];
          expect(field.type).toBe('string');
          expect(field.runtimeField.type).toBe('keyword');
          expect(field.runtimeField.script.source).toBe("doc['something_new'].value");
        });

        await apiTest.step('partial update of runtimeFoo (only script)', async () => {
          const partialResponse = await apiClient.post(
            `${DATA_VIEW_PATH}/${id}/runtime_field/runtimeFoo`,
            {
              headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
              responseType: 'json',
              body: {
                runtimeField: {
                  script: { source: "doc['partial_update'].value" },
                },
              },
            }
          );

          expect(partialResponse).toHaveStatusCode(200);
          expect(partialResponse.body.fields[0].runtimeField.script.source).toBe(
            "doc['partial_update'].value"
          );
        });
      }
    );
  }
);
