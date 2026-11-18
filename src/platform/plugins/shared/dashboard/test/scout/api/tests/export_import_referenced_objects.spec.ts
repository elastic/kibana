/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiClientFixture, KbnClient, KibanaRole, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, DASHBOARD_API_PATH } from '../fixtures';

const SOURCE_SPACE = 'export-refs-source';
const DESTINATION_SPACE = 'export-refs-destination';
const OVERWRITE_SPACE = 'export-refs-overwrite';
const SPACES = [SOURCE_SPACE, DESTINATION_SPACE, OVERWRITE_SPACE];

const FIRST_ID = 'export-refs-first';
const SECOND_ID = 'export-refs-second';
const DROPPED_PANEL_ID = 'export-refs-dropped-panel';
const INVALID_BODY_ID = 'export-refs-invalid-body';

// Can read Discover sessions but not dashboards.
const NO_DASHBOARDS_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
};

const spacePath = (space: string, path: string) => `/s/${space}/${path}`;

const storedDashboard = (title: string, panels: object[] = []) => ({
  title,
  panelsJSON: JSON.stringify(panels),
  optionsJSON: '{}',
  timeRestore: false,
  version: 1,
  kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
});

interface ExportedObject {
  type: string;
  id: string;
  data: Record<string, unknown>;
}

apiTest.describe(
  'dashboards - export and import with referenced objects',
  { tag: tags.stateful.classic },
  () => {
    let allCredentials: RoleApiCredentials;

    const putDashboard = async (apiClient: ApiClientFixture, id: string, title: string) => {
      const response = await apiClient.put(spacePath(SOURCE_SPACE, `${DASHBOARD_API_PATH}/${id}`), {
        headers: { ...COMMON_HEADERS, ...allCredentials.apiKeyHeader },
        body: { title, query: { expression: 'host.name: "a"', language: 'kql' } },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(201);
    };

    apiTest.beforeAll(async ({ apiClient, kbnClient, requestAuth }) => {
      allCredentials = await requestAuth.getApiKeyForAdmin();
      for (const id of SPACES) {
        await kbnClient.spaces.create({ id, name: id });
      }
      await putDashboard(apiClient, FIRST_ID, 'Export refs first');
      await putDashboard(apiClient, SECOND_ID, 'Export refs second');
      // Stored directly, because the Dashboards API would refuse them.
      await kbnClient.savedObjects.create({
        type: 'dashboard',
        id: DROPPED_PANEL_ID,
        space: SOURCE_SPACE,
        overwrite: true,
        attributes: storedDashboard('Export refs dropped panel', [
          {
            type: 'export_refs_unknown_panel',
            panelIndex: 'p1',
            gridData: { x: 0, y: 0, w: 24, h: 15, i: 'p1' },
            embeddableConfig: {},
          },
        ]),
      });
      // An empty title is stored, but the PUT schema rejects it.
      await kbnClient.savedObjects.create({
        type: 'dashboard',
        id: INVALID_BODY_ID,
        space: SOURCE_SPACE,
        overwrite: true,
        attributes: storedDashboard(''),
      });
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      for (const id of SPACES) {
        await kbnClient.spaces.delete(id);
      }
    });

    const exportDashboards = (
      apiClient: ApiClientFixture,
      ids: string[],
      credentials = allCredentials
    ) =>
      apiClient.post(spacePath(SOURCE_SPACE, `${DASHBOARD_API_PATH}/_export`), {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        body: { ids },
        responseType: 'json',
      });

    const importObjects = (
      apiClient: ApiClientFixture,
      space: string,
      body: { objects: ExportedObject[]; mode?: string }
    ) =>
      apiClient.post(spacePath(space, `${DASHBOARD_API_PATH}/_import`), {
        headers: { ...COMMON_HEADERS, ...allCredentials.apiKeyHeader },
        body,
        responseType: 'json',
      });

    // Exports dashboards created for the test, then deletes them so their IDs are unused, as in another deployment.
    const exportAndDeleteFromSource = async (
      apiClient: ApiClientFixture,
      kbnClient: KbnClient,
      ids: string[]
    ): Promise<ExportedObject[]> => {
      for (const id of ids) {
        await putDashboard(apiClient, id, `Export refs ${id.replace('export-refs-', '')}`);
      }
      const { body } = await exportDashboards(apiClient, ids);
      for (const id of ids) {
        await kbnClient.savedObjects.delete({ type: 'dashboard', id, space: SOURCE_SPACE });
      }
      return body.objects;
    };

    const getDashboard = (apiClient: ApiClientFixture, space: string, id: string) =>
      apiClient.get(spacePath(space, `${DASHBOARD_API_PATH}/${id}`), {
        headers: { ...COMMON_HEADERS, ...allCredentials.apiKeyHeader },
        responseType: 'json',
      });

    apiTest('exports dashboards as the bodies the PUT accepts', async ({ apiClient }) => {
      const response = await exportDashboards(apiClient, [FIRST_ID, SECOND_ID]);

      expect(response).toHaveStatusCode(200);
      expect(response.body.problems).toStrictEqual([]);
      expect(
        (response.body.objects as ExportedObject[]).map(({ type, id, data }) => ({
          type,
          id,
          title: data.title,
        }))
      ).toStrictEqual([
        { type: 'dashboard', id: FIRST_ID, title: 'Export refs first' },
        { type: 'dashboard', id: SECOND_ID, title: 'Export refs second' },
      ]);
      const [{ data }] = response.body.objects as ExportedObject[];
      expect('access_control' in data).toBe(false);

      // The body can be sent to the PUT unchanged.
      const putResponse = await apiClient.put(
        spacePath(SOURCE_SPACE, `${DASHBOARD_API_PATH}/${FIRST_ID}`),
        {
          headers: { ...COMMON_HEADERS, ...allCredentials.apiKeyHeader },
          body: data,
          responseType: 'json',
        }
      );
      expect(putResponse).toHaveStatusCode(200);
    });

    apiTest(
      'reports roots that convert badly as export problems and still exports the others',
      async ({ apiClient }) => {
        const response = await exportDashboards(apiClient, [
          FIRST_ID,
          DROPPED_PANEL_ID,
          INVALID_BODY_ID,
        ]);

        expect(response).toHaveStatusCode(200);
        expect((response.body.objects as ExportedObject[]).map(({ id }) => id)).toStrictEqual([
          FIRST_ID,
          DROPPED_PANEL_ID,
        ]);
        expect(response.body.problems).toStrictEqual([
          {
            type: 'dashboard',
            id: DROPPED_PANEL_ID,
            reason: 'dropped_content',
            message: expect.stringContaining('export_refs_unknown_panel'),
            roots: [DROPPED_PANEL_ID],
          },
          {
            type: 'dashboard',
            id: INVALID_BODY_ID,
            reason: 'invalid_body',
            message: expect.stringContaining('title'),
            roots: [INVALID_BODY_ID],
          },
        ]);
      }
    );

    apiTest('fails the whole export with 400 when a root is missing', async ({ apiClient }) => {
      const response = await exportDashboards(apiClient, [FIRST_ID, 'export-refs-missing']);

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe('Error fetching objects to export');
      expect(response.body.attributes.objects).toStrictEqual([
        expect.objectContaining({ type: 'dashboard', id: 'export-refs-missing' }),
      ]);
    });

    apiTest(
      'fails the whole export with 403 when the caller cannot read dashboards',
      async ({ apiClient, requestAuth }) => {
        const credentials = await requestAuth.getApiKeyForCustomRole(NO_DASHBOARDS_ROLE);
        const response = await exportDashboards(apiClient, [FIRST_ID], credentials);

        expect(response).toHaveStatusCode(403);
        expect(response.body.message).toContain('dashboard');
      }
    );

    apiTest(
      'moves dashboards into a space where their IDs are unused, then reports conflicts without writing them',
      async ({ apiClient, kbnClient }) => {
        const ids = ['export-refs-moved-1', 'export-refs-moved-2'];
        const objects = await exportAndDeleteFromSource(apiClient, kbnClient, ids);

        const first = await importObjects(apiClient, DESTINATION_SPACE, { objects });
        expect(first).toHaveStatusCode(200);
        expect(first.body).toStrictEqual({
          success: true,
          results: ids.map((id) => ({
            type: 'dashboard',
            id,
            destination_id: id,
            status: 'created',
          })),
          warnings: [],
        });
        for (const { id, data } of objects) {
          const { body } = await getDashboard(apiClient, DESTINATION_SPACE, id);
          expect(body.data).toStrictEqual(data);
        }

        const changed = objects.map((object) => ({
          ...object,
          data: { ...object.data, title: 'Changed' },
        }));
        const second = await importObjects(apiClient, DESTINATION_SPACE, { objects: changed });
        expect(second).toHaveStatusCode(200);
        expect(second.body).toStrictEqual({
          success: false,
          results: ids.map((id) => ({
            type: 'dashboard',
            id,
            destination_id: id,
            status: 'conflict',
          })),
          warnings: [],
        });
        const { body: unchanged } = await getDashboard(apiClient, DESTINATION_SPACE, ids[0]);
        expect(unchanged.data.title).toBe('Export refs moved-1');

        const overwritten = await importObjects(apiClient, DESTINATION_SPACE, {
          objects: changed,
          mode: 'overwrite',
        });
        expect(overwritten).toHaveStatusCode(200);
        expect(overwritten.body.results).toStrictEqual(
          ids.map((id) => ({ type: 'dashboard', id, destination_id: id, status: 'overwritten' }))
        );
        const { body: updated } = await getDashboard(apiClient, DESTINATION_SPACE, ids[0]);
        expect(updated.data.title).toBe('Changed');
      }
    );

    apiTest(
      'moves dashboards into a space where their IDs are unused in overwrite mode',
      async ({ apiClient, kbnClient }) => {
        const ids = ['export-refs-moved-3'];
        const objects = await exportAndDeleteFromSource(apiClient, kbnClient, ids);

        const response = await importObjects(apiClient, OVERWRITE_SPACE, {
          objects,
          mode: 'overwrite',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.results).toStrictEqual(
          ids.map((id) => ({ type: 'dashboard', id, destination_id: id, status: 'created' }))
        );
        const { body } = await getDashboard(apiClient, OVERWRITE_SPACE, ids[0]);
        expect(body.data).toStrictEqual(objects[0].data);
      }
    );

    apiTest(
      'copies a dashboard whose ID is used in another space under a new ID, like Copy to space',
      async ({ apiClient }) => {
        const { body: exported } = await exportDashboards(apiClient, [SECOND_ID]);
        const [object] = exported.objects as ExportedObject[];

        const response = await importObjects(apiClient, OVERWRITE_SPACE, { objects: [object] });

        expect(response).toHaveStatusCode(200);
        const [result] = response.body.results;
        expect(result.status).toBe('created');
        expect(result.destination_id).not.toBe(SECOND_ID);
        const { body } = await getDashboard(apiClient, OVERWRITE_SPACE, result.destination_id);
        expect(body.data).toStrictEqual(object.data);
      }
    );

    apiTest(
      'rejects an invalid body or an unsupported type for that object only',
      async ({ apiClient }) => {
        const response = await importObjects(apiClient, DESTINATION_SPACE, {
          objects: [
            { type: 'dashboard', id: 'export-refs-no-title', data: { panels: [] } },
            { type: 'map', id: 'export-refs-map', data: { title: 'A map' } },
            { type: 'dashboard', id: 'export-refs-valid', data: { title: 'Valid' } },
          ],
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({
          success: false,
          results: [
            {
              type: 'dashboard',
              id: 'export-refs-no-title',
              destination_id: 'export-refs-no-title',
              status: 'error',
              error: { type: 'invalid_body', message: expect.stringContaining('title') },
            },
            {
              type: 'map',
              id: 'export-refs-map',
              destination_id: 'export-refs-map',
              status: 'error',
              error: { type: 'unsupported_type', message: expect.stringContaining('map') },
            },
            {
              type: 'dashboard',
              id: 'export-refs-valid',
              destination_id: 'export-refs-valid',
              status: 'created',
            },
          ],
          warnings: [],
        });
      }
    );

    apiTest('returns 404 while the feature flag is off', async ({ apiClient, apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { 'dashboard.exportReferencedObjectsEnabled': false },
      });
      try {
        const exportResponse = await exportDashboards(apiClient, [FIRST_ID]);
        const importResponse = await importObjects(apiClient, DESTINATION_SPACE, {
          objects: [{ type: 'dashboard', id: FIRST_ID, data: { title: 'Flag off' } }],
        });

        expect(exportResponse).toHaveStatusCode(404);
        expect(importResponse).toHaveStatusCode(404);
      } finally {
        await apiServices.core.settings({
          'feature_flags.overrides': { 'dashboard.exportReferencedObjectsEnabled': true },
        });
      }
    });
  }
);
