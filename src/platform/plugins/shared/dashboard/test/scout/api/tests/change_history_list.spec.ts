/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import type { ApiClientFixture, SamlAuth } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, DASHBOARD_API_PATH } from '../fixtures';

type ApiClient = ApiClientFixture;

interface HistoryItem {
  id: string;
  action: string;
  isCurrent: boolean;
  timestamp: string;
  actor: { name: string; id?: string };
  comment?: string;
  metadata: { version: number };
}

const HISTORY_PATH = 'internal/dashboard/change_history';

/** Upper bound for how long a create or update history event may take to become searchable */
const HISTORY_SEARCHABLE_TIMEOUT = 30_000;

apiTest.describe('dashboard change history - list', { tag: tags.stateful.classic }, () => {
  const runId = randomUUID();
  const spaceId = `history-list-${runId}`;
  // dashboard ids are globally unique, so they need a per-run suffix as well
  const dashboardId = `history-list-dashboard-${runId}`;
  const titles = ['Version one', 'Version two', 'Version three', 'Version four', 'Version five'];

  const editor = {
    elasticsearch: { cluster: [] },
    kibana: [{ base: [], feature: { dashboard_v2: ['all'] }, spaces: [spaceId] }],
  };
  let samlAuth: SamlAuth;

  apiTest.beforeAll(async ({ apiServices, apiClient, samlAuth: saml }) => {
    samlAuth = saml;
    await apiServices.spaces.create({ id: spaceId, name: spaceId });

    for (const [index, title] of titles.entries()) {
      const saved = await apiClient.put(
        `s/${spaceId}/${DASHBOARD_API_PATH}/${dashboardId}`,
        await requestOptions({ title })
      );
      expect(saved).toHaveStatusCode(index === 0 ? 201 : 200);
    }
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(spaceId);
  });

  const requestOptions = async (body?: Record<string, unknown>) => ({
    headers: { ...COMMON_HEADERS, ...(await samlAuth.asInteractiveUser(editor)).cookieHeader },
    responseType: 'json' as const,
    ...(body ? { body } : {}),
  });

  const listHistory = async (apiClient: ApiClient, query = '') =>
    apiClient.get(`s/${spaceId}/${HISTORY_PATH}/${dashboardId}${query}`, await requestOptions());

  // Create and update events are indexed without waiting for a refresh, and consecutive searches can
  // be served by shard copies sitting at different refresh points, so a total observed by one
  // request says nothing about the next one: assert on the response that saw the whole history
  const listHistoryOnceComplete = async (apiClient: ApiClient, query = '') => {
    let complete: Awaited<ReturnType<typeof listHistory>> | undefined;
    await expect
      .poll(
        async () => {
          complete = await listHistory(apiClient, query);
          return complete.body.total;
        },
        { timeout: HISTORY_SEARCHABLE_TIMEOUT }
      )
      .toBe(titles.length);
    if (!complete) {
      throw new Error('expect.poll resolved without reading the change history');
    }
    return complete;
  };

  apiTest(
    'lists every version, newest first, with the current one flagged',
    async ({ apiClient }) => {
      const response = await listHistoryOnceComplete(apiClient);
      expect(response).toHaveStatusCode(200);

      const { total, items } = response.body as { total: number; items: HistoryItem[] };
      expect(total).toBe(titles.length);
      expect(items.map((item) => item.metadata.version)).toStrictEqual([5, 4, 3, 2, 1]);
      expect(items.map((item) => item.isCurrent)).toStrictEqual([true, false, false, false, false]);
      expect(items.map((item) => item.action)).toStrictEqual([
        'dashboard_update',
        'dashboard_update',
        'dashboard_update',
        'dashboard_update',
        'dashboard_create',
      ]);
      for (const item of items) {
        expect(typeof item.actor.name).toBe('string');
        expect(Number.isNaN(Date.parse(item.timestamp))).toBe(false);
      }
    }
  );

  apiTest('pages through history with page and per_page', async ({ apiClient }) => {
    const first = await listHistoryOnceComplete(apiClient, '?page=1&per_page=2');
    const second = await listHistoryOnceComplete(apiClient, '?page=2&per_page=2');
    const last = await listHistoryOnceComplete(apiClient, '?page=3&per_page=2');
    const beyond = await listHistoryOnceComplete(apiClient, '?page=4&per_page=2');

    for (const response of [first, second, last, beyond]) {
      expect(response).toHaveStatusCode(200);
      // the total is the size of the whole history, not of the page
      expect(response.body.total).toBe(titles.length);
    }
    const versions = (response: { body: { items: HistoryItem[] } }) =>
      response.body.items.map((item) => item.metadata.version);
    expect(versions(first)).toStrictEqual([5, 4]);
    expect(versions(second)).toStrictEqual([3, 2]);
    expect(versions(last)).toStrictEqual([1]);
    expect(versions(beyond)).toStrictEqual([]);
    // only the page holding the newest version flags it as current
    expect(first.body.items[0].isCurrent).toBe(true);
    expect(second.body.items.some((item: HistoryItem) => item.isCurrent)).toBe(false);
  });

  apiTest('rejects invalid query parameters', async ({ apiClient }) => {
    expect(await listHistory(apiClient, '?page=not-a-number')).toHaveStatusCode(400);
    expect(await listHistory(apiClient, '?per_page=not-a-number')).toHaveStatusCode(400);
    // the query is strict, so unknown parameters are rejected rather than ignored
    expect(await listHistory(apiClient, '?unknown=1')).toHaveStatusCode(400);
  });
});
