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

const FIELDS_FOR_WILDCARD_PATH = 'internal/data_views/_fields_for_wildcard';
const ES_ARCHIVE_CONFLICTS =
  'src/platform/test/api_integration/fixtures/es_archiver/index_patterns/conflicts';

// Internal APIs use version '1' instead of the public API version '2023-10-31'
const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
};

apiTest.describe(
  'GET /internal/data_views/_fields_for_wildcard - conflicts',
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
      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?pattern=logs-*`, {
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
