/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, apiTest, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { ES_ARCHIVE_CONFLICTS } from '../fixtures/constants';

// Fields route path (GET only, like fields_for_wildcard but simplified)
const FIELDS_ROUTE = 'internal/data_views/fields';

// API version for internal fields endpoint
const INITIAL_REST_VERSION_INTERNAL = '1';

// Internal APIs use a specific version header
const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
};

apiTest.describe(
  'GET /internal/data_views/fields - conflicts',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ esArchiver, requestAuth, log }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);

      await esArchiver.loadIfNeeded(ES_ARCHIVE_CONFLICTS);
      log.info(`Loaded ES archive: ${ES_ARCHIVE_CONFLICTS}`);
    });

    apiTest('flags fields with mismatched types as conflicting', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', 'logs-*');
      params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

      const response = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
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
