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
    // Dashboard ids are globally unique (multiple-isolated), so a new Space does not avoid
    // collisions with dashboards left by an interrupted run or created by another execution
    const runId = randomUUID();
    const spaceA = `history-a-${runId}`;
    const spaceB = `history-b-${runId}`;
    const dashboardId = `history-restore-dashboard-${runId}`;
    const dashboardIdB = `history-restore-dashboard-b-${runId}`;

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

    const putDashboard = async (
      apiClient: ApiClient,
      spaceId: string,
      id: string,
      body: Record<string, unknown>,
      auth: Role = editorBothSpaces
    ) =>
      apiClient.put(`${spacePrefix(spaceId)}${DASHBOARD_API_PATH}/${id}`, {
        headers: await headers(auth),
        body,
        responseType: 'json',
      });

    const saveDashboard = async (
      apiClient: ApiClient,
      spaceId: string,
      title: string,
      auth: Role = editorBothSpaces,
      id: string = dashboardId
    ) => putDashboard(apiClient, spaceId, id, { title }, auth);

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

    // Creates a dashboard with one version per title, so each test owns its history
    const seedVersions = async (
      apiClient: ApiClient,
      spaceId: string,
      id: string,
      titles: string[]
    ) => {
      for (const [index, title] of titles.entries()) {
        expect(
          await saveDashboard(apiClient, spaceId, title, editorBothSpaces, id)
        ).toHaveStatusCode(index === 0 ? 201 : 200);
      }
      return waitForVersions(apiClient, spaceId, titles.length, id);
    };

    apiTest('restore persists the snapshot and records a new version', async ({ apiClient }) => {
      const before = await seedVersions(apiClient, spaceA, dashboardId, [
        'Version one',
        'Version two',
      ]);
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
      expect(newest.comment).toBe('Restored from v1');
      expect(after.map((item) => item.isCurrent)).toStrictEqual([true, false, false]);
      expect(after[1].comment).toBeUndefined();
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

    apiTest('restore brings back configured panels and their references', async ({ apiClient }) => {
      const id = `history-restore-panels-${runId}`;
      const byValuePanel = {
        id: 'by-value-lens-panel',
        type: 'vis',
        grid: { x: 0, y: 0, w: 24, h: 10 },
        config: {
          type: 'metric',
          title: 'Request count',
          data_source: { type: 'data_view_reference', ref_id: 'history-restore-data-view' },
          metrics: [{ type: 'primary', operation: 'count' }],
        },
      };
      const byRefPanel = {
        id: 'by-ref-lens-panel',
        type: 'vis',
        grid: { x: 24, y: 0, w: 24, h: 10 },
        config: { ref_id: 'history-restore-library-lens' },
      };
      const panelSummary = (panels: Array<{ id?: string; type: string; config: any }>) =>
        panels.map((panel) => ({
          id: panel.id,
          type: panel.type,
          dataViewId: panel.config.data_source?.ref_id,
          lensId: panel.config.ref_id,
          metricType: panel.config.type,
        }));
      const expectedPanels = [
        {
          id: 'by-value-lens-panel',
          type: 'vis',
          dataViewId: 'history-restore-data-view',
          lensId: undefined,
          metricType: 'metric',
        },
        {
          id: 'by-ref-lens-panel',
          type: 'vis',
          dataViewId: undefined,
          lensId: 'history-restore-library-lens',
          metricType: undefined,
        },
      ];

      // version 1 has the Lens panels, version 2 has none
      expect(
        await putDashboard(apiClient, spaceA, id, {
          title: 'With panels',
          panels: [byValuePanel, byRefPanel],
        })
      ).toHaveStatusCode(201);
      const created = await getDashboard(apiClient, spaceA, id);
      expect(panelSummary(created.body.data.panels)).toStrictEqual(expectedPanels);
      expect(
        await putDashboard(apiClient, spaceA, id, { title: 'Without panels', panels: [] })
      ).toHaveStatusCode(200);
      expect((await getDashboard(apiClient, spaceA, id)).body.data.panels).toStrictEqual([]);
      const before = await waitForVersions(apiClient, spaceA, 2, id);
      const versionOne = before[1];

      // the snapshot itself holds the panels, otherwise restoring them could not work
      const snapshot = await getChange(apiClient, spaceA, versionOne.id, editorBothSpaces, id);
      expect(snapshot).toHaveStatusCode(200);
      expect(snapshot.body.snapshot.panels).toHaveLength(2);

      const restored = await restore(apiClient, spaceA, versionOne.id, editorBothSpaces, id);
      expect(restored).toHaveStatusCode(200);
      // the restore response uses the dashboard app panel format, where by-value Lens panels hold
      // stored attributes and their references, unlike the as-code panels returned when reading
      const [restoredByValue, restoredByRef] = restored.body.panels;
      expect(restoredByValue.id).toBe(byValuePanel.id);
      expect(restoredByValue.config.title).toBe('Request count');
      expect(restoredByValue.config.attributes.references).toStrictEqual([
        {
          type: 'index-pattern',
          id: 'history-restore-data-view',
          name: 'indexpattern-datasource-layer-layer_0',
        },
      ]);
      expect(restoredByRef.id).toBe(byRefPanel.id);
      expect(restoredByRef.config.ref_id).toBe('history-restore-library-lens');

      // the panels and their references are persisted, not just echoed back by the route
      const saved = await getDashboard(apiClient, spaceA, id);
      expect(saved).toHaveStatusCode(200);
      expect(saved.body.data.title).toBe('With panels');
      expect(panelSummary(saved.body.data.panels)).toStrictEqual(expectedPanels);
      expect(saved.body.data.panels.map((panel: { grid: unknown }) => panel.grid)).toStrictEqual([
        byValuePanel.grid,
        byRefPanel.grid,
      ]);
      expect(saved.body.data.panels[0].config.title).toBe('Request count');
      // the API fills in defaults for unspecified properties
      expect(saved.body.data.panels[0].config.metrics).toMatchObject([
        { type: 'primary', operation: 'count' },
      ]);
    });

    apiTest(
      'a user with read-only access cannot read or restore history',
      async ({ apiClient }) => {
        const id = `history-read-only-${runId}`;
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
        const id = `history-authz-dashboard-${runId}`;
        const itemsA = await seedVersions(apiClient, spaceA, id, ['Space A one', 'Space A two']);

        // the user can read space A history, proving the rejections below are about space B
        expect(await listHistory(apiClient, spaceA, editorSpaceAOnly, id)).toHaveStatusCode(200);

        const list = await listHistory(apiClient, spaceB, editorSpaceAOnly, id);
        const details = await getChange(apiClient, spaceB, itemsA[0].id, editorSpaceAOnly, id);
        const restored = await restore(apiClient, spaceB, itemsA[0].id, editorSpaceAOnly, id);
        expect(list).toHaveStatusCode(403);
        expect(details).toHaveStatusCode(403);
        expect(restored).toHaveStatusCode(403);
      }
    );

    apiTest(
      'history and restore never cross Spaces for a user who can access both',
      async ({ apiClient }) => {
        const dashboardIdA = `history-cross-space-dashboard-a-${runId}`;
        const asA = [editorBothSpaces, dashboardIdA] as const;
        const asB = [editorBothSpaces, dashboardIdB] as const;
        const itemsA = await seedVersions(apiClient, spaceA, dashboardIdA, [
          'Space A original',
          'Space A title',
        ]);
        const itemsB = await seedVersions(apiClient, spaceB, dashboardIdB, [
          'Space B original',
          'Space B edited',
        ]);
        const [changeFromA] = itemsA;

        // space A's dashboard and history are not reachable through space B
        expect(await listHistory(apiClient, spaceB, ...asA)).toHaveStatusCode(404);
        expect(await getChange(apiClient, spaceB, changeFromA.id, ...asA)).toHaveStatusCode(404);
        expect(await restore(apiClient, spaceB, changeFromA.id, ...asA)).toHaveStatusCode(404);
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
        expect((await getDashboard(apiClient, spaceA, dashboardIdA)).body.data.title).toBe(
          'Space A title'
        );
        expect((await listHistory(apiClient, spaceB, ...asB)).body.total).toBe(2);
        expect((await listHistory(apiClient, spaceA, ...asA)).body.total).toBe(2);

        // a legitimate restore in space B only touches space B
        const restoredB = await restore(apiClient, spaceB, itemsB[1].id, ...asB);
        expect(restoredB).toHaveStatusCode(200);
        expect(restoredB.body.title).toBe('Space B original');
        await waitForVersions(apiClient, spaceB, 3, dashboardIdB);
        expect((await getDashboard(apiClient, spaceA, dashboardIdA)).body.data.title).toBe(
          'Space A title'
        );
        expect((await listHistory(apiClient, spaceA, ...asA)).body.total).toBe(2);
      }
    );

    apiTest(
      'retained history of a deleted dashboard is not reachable from another space reusing its id',
      async ({ apiClient }) => {
        // the same id exists in both spaces, so only Space isolation can reject the requests below:
        // the dashboard exists in B and the history object-id filter matches A's retained events
        const id = `history-reused-id-${runId}`;
        const asB = [editorBothSpaces, id] as const;
        const itemsA = await seedVersions(apiClient, spaceA, id, ['Space A one', 'Space A two']);
        const retainedIds = itemsA.map((item) => item.id);

        const deleted = await apiClient.delete(
          `${spacePrefix(spaceA)}${DASHBOARD_API_PATH}/${id}`,
          {
            headers: await headers(editorBothSpaces),
            responseType: 'json',
          }
        );
        expect(deleted).toHaveStatusCode(204);
        expect(await getDashboard(apiClient, spaceA, id)).toHaveStatusCode(404);

        expect(await saveDashboard(apiClient, spaceB, 'Space B only', ...asB)).toHaveStatusCode(
          201
        );
        // wait for B's own event; a leak of A's retained events would show up before or with it
        await expect
          .poll(async () => (await listHistory(apiClient, spaceB, ...asB)).body.total, {
            timeout: 30_000,
          })
          .toBeGreaterThanOrEqual(1);

        // B only lists its own history, never A's retained snapshots
        const listB = await listHistory(apiClient, spaceB, ...asB);
        expect(listB).toHaveStatusCode(200);
        expect(listB.body.total).toBe(1);
        const itemsB = listB.body.items as Array<{ id: string; metadata: { version: number } }>;
        expect(itemsB.map((item) => item.metadata.version)).toStrictEqual([1]);
        expect(retainedIds).not.toContain(itemsB[0].id);

        // A's retained snapshots can be neither fetched nor restored through B
        for (const changeId of retainedIds) {
          expect(await getChange(apiClient, spaceB, changeId, ...asB)).toHaveStatusCode(404);
          expect(await restore(apiClient, spaceB, changeId, ...asB)).toHaveStatusCode(404);
        }

        // B's dashboard and history are untouched by the rejected restores
        expect((await getDashboard(apiClient, spaceB, id)).body.data.title).toBe('Space B only');
        await expect
          .poll(async () => (await listHistory(apiClient, spaceB, ...asB)).body.total, {
            timeout: 5_000,
          })
          .toBe(1);
        // and A did not get the dashboard back
        expect(await getDashboard(apiClient, spaceA, id)).toHaveStatusCode(404);
      }
    );
  }
);
