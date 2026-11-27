/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, FAVORITES_API_PATH, FavoritesCleanup, INTERNAL_HEADERS } from '../fixtures';

const FAVORITE_TYPE = 'dashboard';

async function getStats(apiClient: ApiClientFixture, adminApiKeyHeader: Record<string, string>) {
  const response = await apiClient.post('internal/telemetry/clusters/_stats', {
    headers: {
      'kbn-xsrf': 'scout',
      [ELASTIC_HTTP_VERSION_HEADER]: '2',
      [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
      ...adminApiKeyHeader,
    },
    body: { unencrypted: true, refreshCache: true },
  });
  expect(response).toHaveStatusCode(200);

  return (response.body as any)[0]?.stats?.stack_stats?.kibana?.plugins?.favorites;
}

apiTest.describe('content management - dashboard favorites: CRUD and telemetry', () => {
  const customSpaceId = `favorites-${randomUUID()}`;
  const favoritesCleanup = new FavoritesCleanup();

  // Admin API key: authenticated without a SAML profile — used for telemetry stats.
  let adminCredentials: RoleApiCredentials;
  let user1CookieHeader: Record<string, string>;
  let user3CookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ config, requestAuth, samlAuth, kbnClient }) => {
    const privilegedRoleName =
      config.serverless && config.projectType === 'es' ? 'developer' : 'editor';
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    ({ cookieHeader: user1CookieHeader } = await samlAuth.asInteractiveUser(privilegedRoleName));
    // Viewer: different identity from editor → different profile_uid for cross-user isolation.
    ({ cookieHeader: user3CookieHeader } = await samlAuth.asInteractiveUser('viewer'));

    await kbnClient.spaces.create({
      id: customSpaceId,
      name: 'Custom Space',
      disabledFeatures: [],
    });
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await favoritesCleanup.cleanup(apiClient);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.spaces.delete(customSpaceId);
  });

  apiTest(
    'dashboard favorites: add, remove, cross-user isolation, cross-space isolation, reader can favorite',
    { tag: tags.deploymentAgnostic },
    async ({ apiClient }) => {
      const suffix = `test-${randomUUID()}`;
      const id1 = `${suffix}-a`;
      const id2 = `${suffix}-b`;

      favoritesCleanup.track({
        favoriteType: FAVORITE_TYPE,
        favoriteId: id1,
        cookieHeader: user1CookieHeader,
      });
      favoritesCleanup.track({
        favoriteType: FAVORITE_TYPE,
        favoriteId: id2,
        cookieHeader: user1CookieHeader,
      });
      favoritesCleanup.track({
        favoriteType: FAVORITE_TYPE,
        favoriteId: id1,
        cookieHeader: user1CookieHeader,
        spaceId: customSpaceId,
      });
      favoritesCleanup.track({
        favoriteType: FAVORITE_TYPE,
        favoriteId: id1,
        cookieHeader: user3CookieHeader,
      });

      await apiTest.step('neither ID is in the list before the test', async () => {
        const r = await apiClient.get(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}`, {
          headers: { ...INTERNAL_HEADERS, ...user1CookieHeader },
        });
        expect(r).toHaveStatusCode(200);
        expect(r.body.favoriteIds).not.toContain(id1);
        expect(r.body.favoriteIds).not.toContain(id2);
      });

      await apiTest.step('favoriting id1 adds it to the list', async () => {
        const r = await apiClient.post(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}/${id1}/favorite`, {
          headers: { ...INTERNAL_HEADERS, ...user1CookieHeader },
        });
        expect(r).toHaveStatusCode(200);
        expect(r.body.favoriteIds).toContain(id1);
      });

      await apiTest.step('favoriting id1 again is idempotent', async () => {
        const r = await apiClient.post(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}/${id1}/favorite`, {
          headers: { ...INTERNAL_HEADERS, ...user1CookieHeader },
        });
        expect(r).toHaveStatusCode(200);
        expect(r.body.favoriteIds.filter((x: string) => x === id1)).toHaveLength(1);
      });

      await apiTest.step('favoriting id2 adds it alongside id1', async () => {
        const r = await apiClient.post(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}/${id2}/favorite`, {
          headers: { ...INTERNAL_HEADERS, ...user1CookieHeader },
        });
        expect(r).toHaveStatusCode(200);
        expect(r.body.favoriteIds).toContain(id1);
        expect(r.body.favoriteIds).toContain(id2);
      });

      await apiTest.step('unfavoriting id1 removes it; id2 remains', async () => {
        const r = await apiClient.post(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}/${id1}/unfavorite`, {
          headers: { ...INTERNAL_HEADERS, ...user1CookieHeader },
        });
        expect(r).toHaveStatusCode(200);
        expect(r.body.favoriteIds).not.toContain(id1);
        expect(r.body.favoriteIds).toContain(id2);
      });

      await apiTest.step('unfavoriting a non-existent id is a no-op', async () => {
        const r = await apiClient.post(
          `${FAVORITES_API_PATH}/${FAVORITE_TYPE}/${suffix}-nonexistent/unfavorite`,
          { headers: { ...INTERNAL_HEADERS, ...user1CookieHeader } }
        );
        expect(r).toHaveStatusCode(200);
      });

      await apiTest.step('list confirms final state', async () => {
        const r = await apiClient.get(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}`, {
          headers: { ...INTERNAL_HEADERS, ...user1CookieHeader },
        });
        expect(r).toHaveStatusCode(200);
        expect(r.body.favoriteIds).not.toContain(id1);
        expect(r.body.favoriteIds).toContain(id2);
      });

      await apiTest.step('user3 does not see user1 favorites (cross-user isolation)', async () => {
        const r = await apiClient.get(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}`, {
          headers: { ...INTERNAL_HEADERS, ...user3CookieHeader },
        });
        expect(r).toHaveStatusCode(200);
        expect(r.body.favoriteIds).not.toContain(id1);
        expect(r.body.favoriteIds).not.toContain(id2);
      });

      await apiTest.step('custom space does not share favorites with default space', async () => {
        const r = await apiClient.get(`s/${customSpaceId}/${FAVORITES_API_PATH}/${FAVORITE_TYPE}`, {
          headers: { ...INTERNAL_HEADERS, ...user1CookieHeader },
        });
        expect(r).toHaveStatusCode(200);
        expect(r.body.favoriteIds).not.toContain(id1);
        expect(r.body.favoriteIds).not.toContain(id2);
      });

      await apiTest.step('favoriting in custom space is isolated from default space', async () => {
        const addInCustom = await apiClient.post(
          `s/${customSpaceId}/${FAVORITES_API_PATH}/${FAVORITE_TYPE}/${id1}/favorite`,
          { headers: { ...INTERNAL_HEADERS, ...user1CookieHeader } }
        );
        expect(addInCustom).toHaveStatusCode(200);
        expect(addInCustom.body.favoriteIds).toContain(id1);

        const defaultList = await apiClient.get(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}`, {
          headers: { ...INTERNAL_HEADERS, ...user1CookieHeader },
        });
        expect(defaultList).toHaveStatusCode(200);
        expect(defaultList.body.favoriteIds).not.toContain(id1);
      });

      await apiTest.step('viewer can list, favorite, and unfavorite', async () => {
        const initialList = await apiClient.get(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}`, {
          headers: { ...INTERNAL_HEADERS, ...user3CookieHeader },
        });
        expect(initialList).toHaveStatusCode(200);
        expect(initialList.body.favoriteIds).not.toContain(id1);

        const favorite = await apiClient.post(
          `${FAVORITES_API_PATH}/${FAVORITE_TYPE}/${id1}/favorite`,
          { headers: { ...INTERNAL_HEADERS, ...user3CookieHeader } }
        );
        expect(favorite).toHaveStatusCode(200);
        expect(favorite.body.favoriteIds).toContain(id1);

        const unfavorite = await apiClient.post(
          `${FAVORITES_API_PATH}/${FAVORITE_TYPE}/${id1}/unfavorite`,
          { headers: { ...INTERNAL_HEADERS, ...user3CookieHeader } }
        );
        expect(unfavorite).toHaveStatusCode(200);
        expect(unfavorite.body.favoriteIds).not.toContain(id1);

        const finalList = await apiClient.get(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}`, {
          headers: { ...INTERNAL_HEADERS, ...user3CookieHeader },
        });
        expect(finalList).toHaveStatusCode(200);
        expect(finalList.body.favoriteIds).not.toContain(id1);
      });
    }
  );

  apiTest(
    'favorites stats reflect delta of added favorites',
    { tag: tags.stateful.classic },
    async ({ apiClient }) => {
      // Snapshot global favorites stats before adding anything.
      const beforeStats = await getStats(apiClient, adminCredentials.apiKeyHeader);
      const baseTotal: number = beforeStats?.dashboard?.total ?? 0;

      // Add a known set across distinct user-space combos:
      //   user1 / default → 2 favorites  (user-space combo 1, 2 items)
      //   user1 / custom  → 1 favorite   (user-space combo 2, 1 item)
      //   user3 / default → 1 favorite   (user-space combo 3, 1 item)
      const suffix = `stats-${randomUUID()}`;
      const idA = `${suffix}-a`;
      const idB = `${suffix}-b`;

      favoritesCleanup.track({
        favoriteType: FAVORITE_TYPE,
        favoriteId: idA,
        cookieHeader: user1CookieHeader,
      });
      favoritesCleanup.track({
        favoriteType: FAVORITE_TYPE,
        favoriteId: idB,
        cookieHeader: user1CookieHeader,
      });
      favoritesCleanup.track({
        favoriteType: FAVORITE_TYPE,
        favoriteId: idA,
        cookieHeader: user1CookieHeader,
        spaceId: customSpaceId,
      });
      favoritesCleanup.track({
        favoriteType: FAVORITE_TYPE,
        favoriteId: idA,
        cookieHeader: user3CookieHeader,
      });

      expect(
        await apiClient.post(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}/${idA}/favorite`, {
          headers: { ...INTERNAL_HEADERS, ...user1CookieHeader },
        })
      ).toHaveStatusCode(200);
      expect(
        await apiClient.post(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}/${idB}/favorite`, {
          headers: { ...INTERNAL_HEADERS, ...user1CookieHeader },
        })
      ).toHaveStatusCode(200);
      expect(
        await apiClient.post(
          `s/${customSpaceId}/${FAVORITES_API_PATH}/${FAVORITE_TYPE}/${idA}/favorite`,
          { headers: { ...INTERNAL_HEADERS, ...user1CookieHeader } }
        )
      ).toHaveStatusCode(200);
      expect(
        await apiClient.post(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}/${idA}/favorite`, {
          headers: { ...INTERNAL_HEADERS, ...user3CookieHeader },
        })
      ).toHaveStatusCode(200);

      const afterStats = await getStats(apiClient, adminCredentials.apiKeyHeader);
      // Shared Cloud deployments can add favorites between snapshots, so assert only our minimum delta.
      expect(afterStats.dashboard.total).toBeGreaterThanOrEqual(baseTotal + 4);
      // total_users_spaces counts saved-object documents; unfavoriting leaves an empty SO behind
      // rather than deleting it, so the count never shrinks across runs.  We can't assert an
      // exact delta here — instead verify each user/space combo directly via the list API.
      const user1DefaultList = await apiClient.get(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}`, {
        headers: { ...INTERNAL_HEADERS, ...user1CookieHeader },
      });
      expect(user1DefaultList).toHaveStatusCode(200);
      expect(user1DefaultList.body.favoriteIds).toContain(idA);
      expect(user1DefaultList.body.favoriteIds).toContain(idB);

      const user1CustomList = await apiClient.get(
        `s/${customSpaceId}/${FAVORITES_API_PATH}/${FAVORITE_TYPE}`,
        { headers: { ...INTERNAL_HEADERS, ...user1CookieHeader } }
      );
      expect(user1CustomList).toHaveStatusCode(200);
      expect(user1CustomList.body.favoriteIds).toContain(idA);

      const user3DefaultList = await apiClient.get(`${FAVORITES_API_PATH}/${FAVORITE_TYPE}`, {
        headers: { ...INTERNAL_HEADERS, ...user3CookieHeader },
      });
      expect(user3DefaultList).toHaveStatusCode(200);
      expect(user3DefaultList.body.favoriteIds).toContain(idA);
      // user1/default has 2 favorites so max is at least 2
      expect(afterStats.dashboard.max_per_user_per_space).toBeGreaterThanOrEqual(2);
    }
  );
});
