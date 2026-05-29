/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  FLIGHTS_DATASET_ID,
  FLIGHTS_ES_INDEX,
  FLIGHTS_OVERVIEW_DASHBOARD_ID,
  FLIGHTS_DATA_TIME_SPAN_MS,
  COMMON_HEADERS,
} from '../fixtures';

/**
 * Unique per-run space ID. Scout shares a single Kibana/ES server across multiple
 * CI lanes, so every resource name that isn't scoped to a space must be unique per
 * run. Using a UUID suffix ensures no two concurrent runs collide on the same space.
 */
const TEST_SPACE_ID = `scout-sd-${randomUUID().slice(0, 8)}`;

const sampleDataApiPath = (space: string) => `/s/${space}/api/sample_data`;

apiTest.describe('sample data API', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, apiClient, kbnClient }) => {
    credentials = await requestAuth.getApiKeyForAdmin();

    // Pre-clean: remove any flights sample data that a previous run may have left
    // behind. This guarantees the "not_installed" pre-condition at the start of
    // every test regardless of prior state. The Kibana API handles both saved
    // objects and the shared ES index — avoid direct index deletion here as
    // kibana_sample_data_flights is shared across CI lanes and deleting it directly
    // can break concurrent test runs.
    await apiClient
      .delete(`${sampleDataApiPath('default')}/${FLIGHTS_DATASET_ID}`, {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      })
      .catch(() => {}); // 404 when not installed is expected

    // Create the unique test space. The try-catch handles the extremely unlikely
    // case of a UUID collision leaving the space from a prior failed run.
    try {
      await kbnClient.spaces.create({ id: TEST_SPACE_ID, name: 'Scout sample data test space' });
    } catch {
      // Space already exists — proceed; afterAll will delete it.
    }
  });

  apiTest.afterAll(async ({ apiClient, kbnClient }) => {
    // Defensive uninstall from both spaces in case a test failed mid-flight.
    // Errors are ignored — the goal is to leave the server clean for the next run,
    // not to assert on the cleanup response. The Kibana API handles ES index removal,
    // so no direct index deletion is needed.
    for (const space of ['default', TEST_SPACE_ID]) {
      await apiClient
        .delete(`${sampleDataApiPath(space)}/${FLIGHTS_DATASET_ID}`, {
          headers: { ...COMMON_HEADERS, ...credentials?.apiKeyHeader },
        })
        .catch(() => {});
    }

    // Remove the test space (also removes all saved objects inside it).
    await kbnClient.spaces.delete(TEST_SPACE_ID).catch(() => {});
  });

  // ---------------------------------------------------------------------------
  // Negative path
  // ---------------------------------------------------------------------------

  apiTest('returns 404 for an unknown dataset ID', async ({ apiClient }) => {
    const response = await apiClient.post('/api/sample_data/xxxx', {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
    });

    expect(response).toHaveStatusCode(404);
  });

  // ---------------------------------------------------------------------------
  // Default space: full lifecycle
  // ---------------------------------------------------------------------------

  apiTest(
    'default space: list, install, verify timestamps and counts, uninstall',
    async ({ apiClient, esClient }) => {
      const apiPath = sampleDataApiPath('default');

      await apiTest.step('list returns not_installed before install', async () => {
        const response = await apiClient.get(apiPath, {
          headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const flights = findFlightsDataset(response.body);
        expect(flights.status).toBe('not_installed');
        expect(flights.overviewDashboard).toBe(FLIGHTS_OVERVIEW_DASHBOARD_ID);
      });

      await apiTest.step(
        'install returns 200 with correct ES index and saved object counts',
        async () => {
          const response = await apiClient.post(`${apiPath}/${FLIGHTS_DATASET_ID}`, {
            headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          expect(response.body).toStrictEqual({
            elasticsearchIndicesCreated: { [FLIGHTS_ES_INDEX]: 13014 },
            kibanaSavedObjectsLoaded: 7,
          });
        }
      );

      await apiTest.step(
        'ES index contains timestamps relative to current time (no ?now= param)',
        async () => {
          const result = await esClient.search<{ timestamp: string }>({
            index: FLIGHTS_ES_INDEX,
            sort: [{ timestamp: { order: 'desc' } }],
          });
          const latestTimestampMs = Date.parse(result.hits.hits[0]._source!.timestamp);
          const delta = Math.abs(Date.now() - latestTimestampMs);
          expect(delta).toBeLessThan(FLIGHTS_DATA_TIME_SPAN_MS);
        }
      );

      await apiTest.step(
        'ES index timestamps shift to match the ?now= parameter on reinstall',
        async () => {
          const nowString = '2000-01-01T00:00:00';
          // Reinstall with a fixed reference date and assert it succeeds.
          const reinstallResponse = await apiClient.post(
            `${apiPath}/${FLIGHTS_DATASET_ID}?now=${nowString}`,
            { headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader } }
          );
          expect(reinstallResponse).toHaveStatusCode(200);
          const result = await esClient.search<{ timestamp: string }>({
            index: FLIGHTS_ES_INDEX,
            sort: [{ timestamp: { order: 'desc' } }],
          });
          const latestTimestampMs = Date.parse(result.hits.hits[0]._source!.timestamp);
          const delta = Math.abs(Date.parse(nowString) - latestTimestampMs);
          expect(delta).toBeLessThan(FLIGHTS_DATA_TIME_SPAN_MS);
        }
      );

      await apiTest.step('list returns installed status after install', async () => {
        const response = await apiClient.get(apiPath, {
          headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const flights = findFlightsDataset(response.body);
        expect(flights.status).toBe('installed');
        expect(flights.overviewDashboard).toBe(FLIGHTS_OVERVIEW_DASHBOARD_ID);
      });

      await apiTest.step('uninstall returns 204', async () => {
        const response = await apiClient.delete(`${apiPath}/${FLIGHTS_DATASET_ID}`, {
          headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        });
        expect(response).toHaveStatusCode(204);
      });

      await apiTest.step('ES index is removed after uninstall', async () => {
        const indexExists = await esClient.indices.exists({ index: FLIGHTS_ES_INDEX });
        expect(indexExists).toBe(false);
      });

      await apiTest.step('list returns not_installed status after uninstall', async () => {
        const response = await apiClient.get(apiPath, {
          headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const flights = findFlightsDataset(response.body);
        expect(flights.status).toBe('not_installed');
        expect(flights.overviewDashboard).toBe(FLIGHTS_OVERVIEW_DASHBOARD_ID);
      });
    }
  );

  // ---------------------------------------------------------------------------
  // Non-default space: ID preservation + full lifecycle
  // ---------------------------------------------------------------------------

  apiTest(
    'non-default space: install and uninstall work correctly; saved object IDs are preserved',
    async ({ apiClient, esClient }) => {
      const apiPath = sampleDataApiPath(TEST_SPACE_ID);

      await apiTest.step('list returns not_installed before install', async () => {
        const response = await apiClient.get(apiPath, {
          headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const flights = findFlightsDataset(response.body);
        expect(flights.status).toBe('not_installed');
        // Before install the overviewDashboard reflects the canonical schema ID in all spaces
        expect(flights.overviewDashboard).toBe(FLIGHTS_OVERVIEW_DASHBOARD_ID);
      });

      await apiTest.step(
        'install returns 200 with correct ES index and saved object counts',
        async () => {
          const response = await apiClient.post(`${apiPath}/${FLIGHTS_DATASET_ID}`, {
            headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          expect(response.body).toStrictEqual({
            elasticsearchIndicesCreated: { [FLIGHTS_ES_INDEX]: 13014 },
            kibanaSavedObjectsLoaded: 7,
          });
        }
      );

      await apiTest.step(
        'list shows installed status and the canonical overviewDashboard ID in non-default space',
        async () => {
          const response = await apiClient.get(apiPath, {
            headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          const flights = findFlightsDataset(response.body);
          expect(flights.status).toBe('installed');
          // The installer always uses createNewCopies: false, so IDs are preserved across all spaces.
          // The FTR test that expected a regenerated ID here was testing stale behaviour.
          expect(flights.overviewDashboard).toBe(FLIGHTS_OVERVIEW_DASHBOARD_ID);
        }
      );

      await apiTest.step('uninstall returns 204', async () => {
        const response = await apiClient.delete(`${apiPath}/${FLIGHTS_DATASET_ID}`, {
          headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        });
        expect(response).toHaveStatusCode(204);
      });

      await apiTest.step('ES index is removed after uninstall', async () => {
        const indexExists = await esClient.indices.exists({ index: FLIGHTS_ES_INDEX });
        expect(indexExists).toBe(false);
      });

      await apiTest.step('list returns not_installed status after uninstall', async () => {
        const response = await apiClient.get(apiPath, {
          headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const flights = findFlightsDataset(response.body);
        expect(flights.status).toBe('not_installed');
        expect(flights.overviewDashboard).toBe(FLIGHTS_OVERVIEW_DASHBOARD_ID);
      });
    }
  );
});

function findFlightsDataset(
  body: Array<{ id: string; status: string; overviewDashboard: string }>
) {
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThan(0);
  const dataset = body.find(({ id }) => id === FLIGHTS_DATASET_ID);
  if (!dataset) {
    throw new Error(`"${FLIGHTS_DATASET_ID}" dataset not found in sample data list response`);
  }
  return dataset;
}
