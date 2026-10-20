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

apiTest.describe('dashboard change history - list', { tag: tags.stateful.classic }, () => {
  const spaceId = `history-list-${randomUUID()}`;
  const dashboardId = 'history-list-dashboard';
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

    // History events are written without waiting for a refresh, so wait until they are searchable
    await expect
      .poll(async () => (await listHistory(apiClient)).body.total, { timeout: 30_000 })
      .toBe(titles.length);
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

  apiTest(
    'lists every version, newest first, with the current one flagged',
    async ({ apiClient }) => {
      const response = await listHistory(apiClient);
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
    const first = await listHistory(apiClient, '?page=1&per_page=2');
    const second = await listHistory(apiClient, '?page=2&per_page=2');
    const last = await listHistory(apiClient, '?page=3&per_page=2');
    const beyond = await listHistory(apiClient, '?page=4&per_page=2');

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

  apiTest(
    'flags the restored version as current and records where it came from',
    async ({ apiClient }) => {
      const id = 'history-list-restored';
      const path = `s/${spaceId}/${HISTORY_PATH}/${id}`;
      for (const title of ['Original', 'Edited']) {
        await apiClient.put(
          `s/${spaceId}/${DASHBOARD_API_PATH}/${id}`,
          await requestOptions({ title })
        );
      }
      await expect
        .poll(async () => (await apiClient.get(path, await requestOptions())).body.total, {
          timeout: 30_000,
        })
        .toBe(2);
      const before = (await apiClient.get(path, await requestOptions())).body
        .items as HistoryItem[];

      const restored = await apiClient.post(
        `${path}/${before[1].id}/_restore`,
        await requestOptions()
      );
      expect(restored).toHaveStatusCode(200);

      await expect
        .poll(async () => (await apiClient.get(path, await requestOptions())).body.total, {
          timeout: 30_000,
        })
        .toBe(3);
      const { items } = (await apiClient.get(path, await requestOptions())).body as {
        items: HistoryItem[];
      };
      expect(items.map((item) => item.isCurrent)).toStrictEqual([true, false, false]);
      expect(items[0].comment).toBe('Restored from v1');
      expect(items[1].comment).toBeUndefined();
    }
  );

  apiTest('rejects invalid query parameters', async ({ apiClient }) => {
    expect(await listHistory(apiClient, '?page=not-a-number')).toHaveStatusCode(400);
    expect(await listHistory(apiClient, '?per_page=not-a-number')).toHaveStatusCode(400);
    // the query is strict, so unknown parameters are rejected rather than ignored
    expect(await listHistory(apiClient, '?unknown=1')).toHaveStatusCode(400);
  });
});
