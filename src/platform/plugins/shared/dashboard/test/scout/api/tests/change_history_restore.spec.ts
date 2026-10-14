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

const HISTORY_PATH = 'internal/dashboard/change_history';

const spacePrefix = (spaceId: string) => `s/${spaceId}/`;

const dashboardRole = (spaces: string[], privilege: 'all' | 'read') => ({
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], feature: { dashboard_v2: [privilege] }, spaces }],
});

type Role = ReturnType<typeof dashboardRole>;

apiTest.describe(
  'dashboard change history - restore round trip and authorization',
  { tag: tags.stateful.classic },
  () => {
    const spaceA = `history-a-${randomUUID()}`;
    const spaceB = `history-b-${randomUUID()}`;
    const dashboardId = 'history-restore-dashboard';
    // dashboards are isolated to a single Space, so their ids are unique across Spaces
    const dashboardIdB = 'history-restore-dashboard-b';

    const editorBothSpaces = dashboardRole([spaceA, spaceB], 'all');
    const editorSpaceAOnly = dashboardRole([spaceA], 'all');
    const viewerSpaceA = dashboardRole([spaceA], 'read');
    let samlAuth: SamlAuth;

    apiTest.beforeAll(async ({ apiServices, samlAuth: saml }) => {
      samlAuth = saml;
      await apiServices.spaces.create({ id: spaceA, name: spaceA });
      await apiServices.spaces.create({ id: spaceB, name: spaceB });
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(spaceA);
      await apiServices.spaces.delete(spaceB);
    });

    // Custom roles share one user, so a cookie is only valid until the next role is requested:
    // always fetch it right before the request it is used for
    const headers = async (role: Role) => ({
      ...COMMON_HEADERS,
      ...(await samlAuth.asInteractiveUser(role)).cookieHeader,
    });

    const saveDashboard = async (
      apiClient: ApiClient,
      spaceId: string,
      title: string,
      auth: Role = editorBothSpaces,
      id: string = dashboardId
    ) =>
      apiClient.put(`${spacePrefix(spaceId)}${DASHBOARD_API_PATH}/${id}`, {
        headers: await headers(auth),
        body: { title },
        responseType: 'json',
      });

    const getDashboard = async (apiClient: ApiClient, spaceId: string, id: string = dashboardId) =>
      apiClient.get(`${spacePrefix(spaceId)}${DASHBOARD_API_PATH}/${id}`, {
        headers: await headers(editorBothSpaces),
        responseType: 'json',
      });

    const listHistory = async (
      apiClient: ApiClient,
      spaceId: string,
      auth: Role = editorBothSpaces,
      id: string = dashboardId
    ) =>
      apiClient.get(`${spacePrefix(spaceId)}${HISTORY_PATH}/${id}`, {
        headers: await headers(auth),
        responseType: 'json',
      });

    const getChange = async (
      apiClient: ApiClient,
      spaceId: string,
      changeId: string,
      auth: Role = editorBothSpaces,
      id: string = dashboardId
    ) =>
      apiClient.get(`${spacePrefix(spaceId)}${HISTORY_PATH}/${id}/${changeId}`, {
        headers: await headers(auth),
        responseType: 'json',
      });

    const restore = async (
      apiClient: ApiClient,
      spaceId: string,
      changeId: string,
      auth: Role = editorBothSpaces,
      id: string = dashboardId
    ) =>
      apiClient.post(`${spacePrefix(spaceId)}${HISTORY_PATH}/${id}/${changeId}/_restore`, {
        headers: await headers(auth),
        responseType: 'json',
      });

    // History events are written without waiting for a refresh, so wait until they are searchable
    const waitForVersions = async (
      apiClient: ApiClient,
      spaceId: string,
      total: number,
      id: string = dashboardId
    ) => {
      await expect
        .poll(
          async () => (await listHistory(apiClient, spaceId, editorBothSpaces, id)).body.total,
          { timeout: 30_000 }
        )
        .toBe(total);
      return (await listHistory(apiClient, spaceId, editorBothSpaces, id)).body.items as Array<{
        id: string;
        action: string;
        isCurrent: boolean;
        comment?: string;
        metadata: { version: number };
      }>;
    };

    apiTest('restore persists the snapshot and records a new version', async ({ apiClient }) => {
      expect(await saveDashboard(apiClient, spaceA, 'Version one')).toHaveStatusCode(201);
      expect(await saveDashboard(apiClient, spaceA, 'Version two')).toHaveStatusCode(200);
      const before = await waitForVersions(apiClient, spaceA, 2);
      expect(before.map((item) => item.metadata.version)).toStrictEqual([2, 1]);
      const versionOne = before[1];

      const restored = await restore(apiClient, spaceA, versionOne.id);
      expect(restored).toHaveStatusCode(200);
      expect(restored.body.title).toBe('Version one');

      // the restore must be persisted, not just echoed back by the route
      const saved = await getDashboard(apiClient, spaceA);
      expect(saved).toHaveStatusCode(200);
      expect(saved.body.data.title).toBe('Version one');

      // restore creates a new version rather than rewinding history
      const after = await waitForVersions(apiClient, spaceA, 3);
      expect(after.map((item) => item.metadata.version)).toStrictEqual([3, 2, 1]);
      const [newest] = after;
      expect(newest.action).toBe('dashboard_update');
      expect(newest.comment).toContain('v1');
      expect(after[1].id).not.toBe(newest.id);

      const details = await getChange(apiClient, spaceA, newest.id);
      expect(details).toHaveStatusCode(200);
      expect(details.body.isCurrent).toBe(true);
      expect(details.body.snapshot.title).toBe('Version one');

      // earlier versions are untouched
      const original = await getChange(apiClient, spaceA, after[1].id);
      expect(original.body.snapshot.title).toBe('Version two');
      expect(original.body.isCurrent).toBe(false);
    });

    apiTest(
      'a user with read-only access cannot read or restore history',
      async ({ apiClient }) => {
        const id = 'history-read-only';
        const path = `${spacePrefix(spaceA)}${HISTORY_PATH}/${id}`;
        expect(
          await apiClient.put(`${spacePrefix(spaceA)}${DASHBOARD_API_PATH}/${id}`, {
            headers: await headers(editorBothSpaces),
            body: { title: 'Read only 1' },
            responseType: 'json',
          })
        ).toHaveStatusCode(201);
        await apiClient.put(`${spacePrefix(spaceA)}${DASHBOARD_API_PATH}/${id}`, {
          headers: await headers(editorBothSpaces),
          body: { title: 'Read only 2' },
          responseType: 'json',
        });
        let items: Array<{ id: string }> = [];
        await expect
          .poll(
            async () => {
              const res = await apiClient.get(path, {
                headers: await headers(editorBothSpaces),
                responseType: 'json',
              });
              items = res.body.items;
              return res.body.total;
            },
            { timeout: 30_000 }
          )
          .toBe(2);
        const oldest = items[items.length - 1];

        const list = await apiClient.get(path, {
          headers: await headers(viewerSpaceA),
          responseType: 'json',
        });
        const details = await apiClient.get(`${path}/${oldest.id}`, {
          headers: await headers(viewerSpaceA),
          responseType: 'json',
        });
        const restored = await apiClient.post(`${path}/${oldest.id}/_restore`, {
          headers: await headers(viewerSpaceA),
          responseType: 'json',
        });
        expect(list).toHaveStatusCode(403);
        expect(details).toHaveStatusCode(403);
        expect(restored).toHaveStatusCode(403);

        const saved = await apiClient.get(`${spacePrefix(spaceA)}${DASHBOARD_API_PATH}/${id}`, {
          headers: await headers(editorBothSpaces),
          responseType: 'json',
        });
        expect(saved.body.data.title).toBe('Read only 2');
        const afterList = await apiClient.get(path, {
          headers: await headers(editorBothSpaces),
          responseType: 'json',
        });
        expect(afterList.body.total).toBe(2);
      }
    );

    apiTest(
      'privileges in one space do not grant access to history in another space',
      async ({ apiClient }) => {
        // the dashboard and its history exist in space A; the user only has access to space A
        expect(await saveDashboard(apiClient, spaceA, 'Space A title')).toHaveStatusCode(200);
        const itemsA = await waitForVersions(apiClient, spaceA, 4);

        // the user can read space A history, proving the rejections below are about space B
        expect(await listHistory(apiClient, spaceA, editorSpaceAOnly)).toHaveStatusCode(200);

        const list = await listHistory(apiClient, spaceB, editorSpaceAOnly);
        const details = await getChange(apiClient, spaceB, itemsA[0].id, editorSpaceAOnly);
        const restored = await restore(apiClient, spaceB, itemsA[0].id, editorSpaceAOnly);
        expect(list).toHaveStatusCode(403);
        expect(details).toHaveStatusCode(403);
        expect(restored).toHaveStatusCode(403);
      }
    );

    apiTest(
      'history and restore never cross Spaces for a user who can access both',
      async ({ apiClient }) => {
        const asB = [editorBothSpaces, dashboardIdB] as const;
        expect(await saveDashboard(apiClient, spaceB, 'Space B original', ...asB)).toHaveStatusCode(
          201
        );
        expect(await saveDashboard(apiClient, spaceB, 'Space B edited', ...asB)).toHaveStatusCode(
          200
        );
        const itemsB = await waitForVersions(apiClient, spaceB, 2, dashboardIdB);
        const itemsA = (await listHistory(apiClient, spaceA)).body.items as Array<{ id: string }>;
        const [changeFromA] = itemsA;

        // space A's dashboard and history are not reachable through space B
        expect(await listHistory(apiClient, spaceB)).toHaveStatusCode(404);
        expect(await getChange(apiClient, spaceB, changeFromA.id)).toHaveStatusCode(404);
        expect(await restore(apiClient, spaceB, changeFromA.id)).toHaveStatusCode(404);
        // a change id from space A does not resolve on space B's dashboard either
        expect(await getChange(apiClient, spaceB, changeFromA.id, ...asB)).toHaveStatusCode(404);
        expect(await restore(apiClient, spaceB, changeFromA.id, ...asB)).toHaveStatusCode(404);
        // and space B's history is not reachable through space A
        expect(await listHistory(apiClient, spaceA, ...asB)).toHaveStatusCode(404);
        expect(await restore(apiClient, spaceA, itemsB[1].id, ...asB)).toHaveStatusCode(404);

        // neither dashboard was modified, and no version was recorded in either space
        expect((await getDashboard(apiClient, spaceB, dashboardIdB)).body.data.title).toBe(
          'Space B edited'
        );
        expect((await getDashboard(apiClient, spaceA)).body.data.title).toBe('Space A title');
        expect((await listHistory(apiClient, spaceB, ...asB)).body.total).toBe(2);
        expect((await listHistory(apiClient, spaceA)).body.total).toBe(4);

        // a legitimate restore in space B only touches space B
        const restoredB = await restore(apiClient, spaceB, itemsB[1].id, ...asB);
        expect(restoredB).toHaveStatusCode(200);
        expect(restoredB.body.title).toBe('Space B original');
        await waitForVersions(apiClient, spaceB, 3, dashboardIdB);
        expect((await getDashboard(apiClient, spaceA)).body.data.title).toBe('Space A title');
        expect((await listHistory(apiClient, spaceA)).body.total).toBe(4);
      }
    );

    apiTest('returns 404 for history of a dashboard that does not exist', async ({ apiClient }) => {
      const missing = `${spacePrefix(spaceA)}${HISTORY_PATH}/does-not-exist`;
      const list = await apiClient.get(missing, {
        headers: await headers(editorBothSpaces),
        responseType: 'json',
      });
      const restored = await apiClient.post(`${missing}/any-change/_restore`, {
        headers: await headers(editorBothSpaces),
        responseType: 'json',
      });
      expect(list).toHaveStatusCode(404);
      expect(restored).toHaveStatusCode(404);
    });
  }
);
