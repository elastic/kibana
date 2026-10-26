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
  ES_ARCHIVE_CONFLICTS,
  FIELDS_FOR_WILDCARD_PATH,
  INTERNAL_COMMON_HEADERS,
} from '../../fixtures/constants';

apiTest.describe(
  `GET /${FIELDS_FOR_WILDCARD_PATH} - conflicts`,
  { tag: tags.deploymentAgnostic },
  () => {
    let viewerApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ esArchiver, requestAuth }) => {
      // Route only reads field metadata, so `viewer` is sufficient.
      viewerApiCredentials = await requestAuth.getApiKey('viewer');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_CONFLICTS);
    });

    apiTest('flags fields with mismatched types as conflicting', async ({ apiClient }) => {
      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?pattern=logs-2017.01.*`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        fields: [
          {
            name: '@timestamp',
            type: 'date',
            esTypes: ['date'],
            aggregatable: true,
            searchable: true,
            readFromDocValues: true,
            metadata_field: false,
          },
          {
            name: 'number_conflict',
            type: 'number',
            esTypes: ['float', 'integer'],
            aggregatable: true,
            searchable: true,
            readFromDocValues: true,
            metadata_field: false,
          },
          {
            name: 'string_conflict',
            type: 'string',
            esTypes: ['keyword', 'text'],
            aggregatable: true,
            searchable: true,
            readFromDocValues: true,
            metadata_field: false,
          },
          {
            name: 'success',
            type: 'conflict',
            esTypes: ['keyword', 'boolean'],
            aggregatable: true,
            searchable: true,
            readFromDocValues: false,
            conflictDescriptions: {
              boolean: ['logs-2017.01.02'],
              keyword: ['logs-2017.01.01'],
            },
            metadata_field: false,
          },
        ],
        indices: ['logs-2017.01.01', 'logs-2017.01.02'],
      });
    });
  }
);
