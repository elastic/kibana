/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const {
  SUGGESTIONS_VALUES_PATH,
  COMMON_HEADERS,
  ES_ARCHIVE_LOGSTASH_FUNCTIONAL,
  KBN_ARCHIVE_SAVED_OBJECTS_BASIC,
  VALUE_SUGGESTIONS_READER_ROLE,
} = testData;

const timestampRange = (gte: string, lte: string) => [
  {
    range: {
      '@timestamp': {
        gte,
        lte,
        format: 'strict_date_optional_time',
      },
    },
  },
];

apiTest.describe('Suggestions API - time based', { tag: tags.deploymentAgnostic }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, esArchiver, kbnClient }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser(VALUE_SUGGESTIONS_READER_ROLE));
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH_FUNCTIONAL);
    await kbnClient.importExport.load(KBN_ARCHIVE_SAVED_OBJECTS_BASIC);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    // The Scout esArchiver fixture only ingests data (no unload), so we only
    // clean up the Kibana saved objects we imported.
    await kbnClient.importExport.unload(KBN_ARCHIVE_SAVED_OBJECTS_BASIC);
  });

  apiTest('filter is applied on a document level with terms_agg', async ({ apiClient }) => {
    const response = await apiClient.post(`${SUGGESTIONS_VALUES_PATH}/logstash-*`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
      body: {
        field: 'extension.raw',
        query: '',
        method: 'terms_agg',
        filters: timestampRange('2015-09-19T23:43:00.000Z', '2015-09-20T00:25:00.000Z'),
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toHaveLength(1);
    expect(response.body).toContain('jpg');
  });

  apiTest(
    'filter returns all results because it was applied on an index level with terms_enum',
    async ({ apiClient }) => {
      const response = await apiClient.post(`${SUGGESTIONS_VALUES_PATH}/logstash-*`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
        body: {
          field: 'extension.raw',
          query: '',
          method: 'terms_enum',
          filters: timestampRange('2015-09-19T23:43:00.000Z', '2015-09-20T00:25:00.000Z'),
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toHaveLength(5);
    }
  );

  apiTest(
    'filter is applied on an index level with terms_enum - find in range',
    async ({ apiClient }) => {
      const response = await apiClient.post(`${SUGGESTIONS_VALUES_PATH}/logstash-*`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
        body: {
          field: 'request.raw',
          query: '/uploads/anatoly-art',
          method: 'terms_enum',
          filters: timestampRange('2015-09-22T00:00:00.000Z', '2015-09-23T00:00:00.000Z'),
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toHaveLength(2);
    }
  );

  apiTest(
    'filter is applied on an index level with terms_enum - does not find outside range',
    async ({ apiClient }) => {
      const response = await apiClient.post(`${SUGGESTIONS_VALUES_PATH}/logstash-*`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
        body: {
          field: 'request.raw',
          query: '/uploads/anatoly-art',
          method: 'terms_enum',
          filters: timestampRange('2015-09-23T00:00:00.000Z', '2015-09-24T00:00:00.000Z'),
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toHaveLength(0);
    }
  );
});
