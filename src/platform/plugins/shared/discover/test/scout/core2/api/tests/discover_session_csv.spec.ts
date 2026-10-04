/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'node:crypto';
import Papa from 'papaparse';
import rison from '@kbn/rison';
import { apiTest, tags, type RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { DISCOVER_APP_LOCATOR } from '../../../../../common/app_locator';
import { BASE_HEADERS } from '../fixtures/constants';

const REPORT_GENERATION_TIMEOUT = 120_000;

apiTest.describe('Discover inline session CSV export', { tag: tags.deploymentAgnostic }, () => {
  // Reporting runs asynchronously; allow time for the job plus setup and assertions.
  apiTest.setTimeout(REPORT_GENERATION_TIMEOUT + 30_000);

  const indexName = `scout-discover-inline-csv-${randomUUID()}`;
  let credentials: RoleApiCredentials;
  let sessionId: string | undefined;
  let reportId: string | undefined;

  apiTest.beforeAll(async ({ esClient, requestAuth }) => {
    credentials = await requestAuth.getApiKeyForPrivilegedUser();
    await esClient.indices.create({
      index: indexName,
      mappings: {
        properties: { service: { type: 'keyword' }, message: { type: 'keyword' } },
      },
    });
    await esClient.bulk({
      index: indexName,
      refresh: 'wait_for',
      operations: [
        { index: {} },
        { service: 'checkout', message: 'first' },
        { index: {} },
        { service: 'search', message: 'excluded' },
        { index: {} },
        { service: 'checkout', message: 'second' },
      ],
    });
  });

  apiTest.afterAll(async ({ apiClient, esClient, kbnClient }) => {
    if (sessionId) {
      await kbnClient.savedObjects.delete({ type: 'search', id: sessionId });
    }

    await esClient.indices.delete({ index: indexName, ignore_unavailable: true });

    if (reportId) {
      await apiClient.delete(`/api/reporting/jobs/delete/${reportId}`, {
        headers: { ...BASE_HEADERS, ...credentials.apiKeyHeader },
      });
    }
  });

  apiTest(
    'exports the stored inline definition and own filter without first saving in Discover',
    async ({ apiServices, apiClient, kbnClient }) => {
      sessionId = await apiServices.discover.create({
        title: 'Inline CSV session',
        tabs: [
          {
            id: 'inline',
            label: 'Inline view',
            data_source: { type: 'data_view_spec', index_pattern: indexName },
            column_order: ['service', 'message'],
            sort: [{ name: 'message', direction: 'asc' }],
            filters: [
              {
                type: 'condition',
                condition: { field: 'service', operator: 'is', value: 'checkout' },
              },
            ],
          },
        ],
      });
      const { version } = await kbnClient.status.get();
      const headers = { ...BASE_HEADERS, ...credentials.apiKeyHeader };

      // Pass only the session ID so reporting loads the stored spec and filter on the server.
      const generated = await apiClient.post('/api/reporting/generate/csv_v2', {
        headers,
        body: {
          jobParams: rison.encode({
            browserTimezone: 'UTC',
            title: 'Inline CSV session',
            version: version.number,
            locatorParams: [
              {
                id: DISCOVER_APP_LOCATOR,
                version: version.number,
                params: { savedSearchId: sessionId },
              },
            ],
          }),
        },
      });
      expect(generated).toHaveStatusCode(200);
      reportId = generated.body.job.id;
      const downloadPath = generated.body.path;

      await expect
        .poll(
          async () => {
            const response = await apiClient.get(downloadPath, { headers, responseType: 'text' });
            return response.statusCode;
          },
          { timeout: REPORT_GENERATION_TIMEOUT, intervals: [1000] }
        )
        .toBe(200);

      const download = await apiClient.get<string>(downloadPath, {
        headers,
        responseType: 'text',
      });
      expect(download).toHaveStatusCode(200);
      const csv = Papa.parse<string[]>(download.body, { skipEmptyLines: true });
      expect(csv.errors).toStrictEqual([]);
      expect(csv.data).toStrictEqual([
        ['service', 'message'],
        ['checkout', 'first'],
        ['checkout', 'second'],
      ]);
    }
  );
});
