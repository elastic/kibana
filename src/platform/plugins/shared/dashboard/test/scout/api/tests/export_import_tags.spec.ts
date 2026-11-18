/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference, SavedObjectTypeIdTuple } from '@kbn/core/server';
import type { ApiClientFixture, KbnClient, KibanaRole, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import type {
  ExportReferencedObjectsResponse,
  ImportReferencedObjectsRequest,
  ImportReferencedObjectsResponse,
} from '@kbn/saved-objects-management-plugin/common';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, DASHBOARD_API_PATH } from '../fixtures';

const SOURCE_SPACE = 'export-refs-tags-source';
const EMPTY_SPACE = 'export-refs-tags-empty';
const POPULATED_SPACE = 'export-refs-tags-populated';
const SPACES = [SOURCE_SPACE, EMPTY_SPACE, POPULATED_SPACE];

const WEB_TAG = 'export-refs-tags-web';
const PROD_TAG = 'export-refs-tags-prod';
const MISSING_TAG = 'export-refs-tags-missing';

const TAGGED = 'export-refs-tags-tagged';
const WITH_MISSING_TAG = 'export-refs-tags-with-missing';

const TAGS_API_VERSION = '2023-10-31';

// Dashboard read covers tags, so a caller who can read a dashboard can read its tags.
const DASHBOARD_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { dashboard: ['read'] }, spaces: ['*'] }],
};

const spacePath = (space: string, path: string) => `/s/${space}/${path}`;

const storedDashboard = (title: string, tagIds: string[]) => ({
  attributes: {
    title,
    panelsJSON: '[]',
    optionsJSON: '{}',
    timeRestore: false,
    version: 1,
    kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
  },
  references: tagIds.map((id) => ({ type: 'tag', id, name: `tag-ref-${id}` })),
});

type ExportedObject = ExportReferencedObjectsResponse['objects'][number];
type ImportResult = ImportReferencedObjectsResponse['results'][number];

apiTest.describe('dashboards - export and import with tags', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;

  const createIn = (
    kbnClient: KbnClient,
    space: string,
    type: string,
    id: string,
    { attributes, references = [] }: { attributes: object; references?: SavedObjectReference[] }
  ) => kbnClient.savedObjects.create({ type, id, space, overwrite: true, attributes, references });

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    for (const id of SPACES) {
      await kbnClient.spaces.create({ id, name: id });
    }

    await createIn(kbnClient, SOURCE_SPACE, 'tag', WEB_TAG, {
      attributes: { name: 'Web', description: 'Web traffic', color: '#772299' },
    });
    await createIn(kbnClient, SOURCE_SPACE, 'tag', PROD_TAG, {
      attributes: { name: 'Production', description: '', color: '#00AA00' },
    });
    await createIn(
      kbnClient,
      SOURCE_SPACE,
      'dashboard',
      TAGGED,
      storedDashboard('Tagged', [WEB_TAG, PROD_TAG])
    );
    await createIn(
      kbnClient,
      SOURCE_SPACE,
      'dashboard',
      WITH_MISSING_TAG,
      storedDashboard('With missing tag', [WEB_TAG, MISSING_TAG])
    );
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    for (const id of SPACES) {
      await kbnClient.spaces.delete(id);
    }
  });

  const exportDashboards = (
    apiClient: ApiClientFixture,
    ids: string[],
    credentials = adminCredentials
  ) =>
    apiClient.post(spacePath(SOURCE_SPACE, `${DASHBOARD_API_PATH}/_export`), {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      body: { ids },
      responseType: 'json',
    });

  const importObjects = (
    apiClient: ApiClientFixture,
    space: string,
    body: Pick<ImportReferencedObjectsRequest, 'objects'> &
      Partial<Pick<ImportReferencedObjectsRequest, 'mode'>>
  ) =>
    apiClient.post(spacePath(space, `${DASHBOARD_API_PATH}/_import`), {
      headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
      body,
      responseType: 'json',
    });

  const getDashboard = (apiClient: ApiClientFixture, space: string, id: string) =>
    apiClient.get(spacePath(space, `${DASHBOARD_API_PATH}/${id}`), {
      headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

  const getTag = (apiClient: ApiClientFixture, space: string, id: string) =>
    apiClient.get(spacePath(space, `api/tags/${id}`), {
      headers: {
        ...COMMON_HEADERS,
        'elastic-api-version': TAGS_API_VERSION,
        ...adminCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

  const toTypeAndId = ({ type, id }: SavedObjectTypeIdTuple) => ({ type, id });
  const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);

  apiTest('exports a dashboard with its tags, before the dashboard', async ({ apiClient }) => {
    const response = await exportDashboards(apiClient, [TAGGED]);

    expect(response).toHaveStatusCode(200);
    expect(response.body.problems).toStrictEqual([]);
    const objects = response.body.objects as ExportedObject[];
    expect(objects[2]).toStrictEqual(expect.objectContaining({ type: 'dashboard', id: TAGGED }));
    expect(objects.slice(0, 2).sort(byId)).toStrictEqual([
      { type: 'tag', id: PROD_TAG, data: { name: 'Production', color: '#00AA00' } },
      {
        type: 'tag',
        id: WEB_TAG,
        data: { name: 'Web', description: 'Web traffic', color: '#772299' },
      },
    ]);
    expect([...(objects[2].data.tags as string[])].sort()).toStrictEqual([PROD_TAG, WEB_TAG]);
  });

  apiTest(
    'moves a tagged dashboard into another space, where it shows the same tags',
    async ({ apiClient }) => {
      const { body: exported } = await exportDashboards(apiClient, [TAGGED]);
      const objects = exported.objects as ExportedObject[];

      // The IDs exist in the source space, so core gives them new IDs, like Copy to space.
      const response = await importObjects(apiClient, EMPTY_SPACE, { objects });

      expect(response).toHaveStatusCode(200);
      expect(response.body.success).toBe(true);
      const results = response.body.results as ImportResult[];
      expect(results.map(({ type, status }) => ({ type, status }))).toStrictEqual([
        { type: 'tag', status: 'created' },
        { type: 'tag', status: 'created' },
        { type: 'dashboard', status: 'created' },
      ]);
      const [firstTag, secondTag, dashboardResult] = results;

      const { body: dashboard } = await getDashboard(
        apiClient,
        EMPTY_SPACE,
        dashboardResult.destination_id
      );
      expect([...(dashboard.data.tags as string[])].sort()).toStrictEqual(
        [firstTag.destination_id, secondTag.destination_id].sort()
      );
      const names = [];
      for (const { destination_id: id } of [firstTag, secondTag]) {
        const tagResponse = await getTag(apiClient, EMPTY_SPACE, id);
        expect(tagResponse).toHaveStatusCode(200);
        names.push(tagResponse.body.data.name);
      }
      expect(names.sort()).toStrictEqual(['Production', 'Web']);
    }
  );

  apiTest(
    "moves a tagged dashboard with its IDs, updating a tag that's already there and allowing a same-name tag",
    async ({ apiClient, kbnClient }) => {
      const tagId = 'export-refs-tags-moved';
      const webTagId = 'export-refs-tags-moved-web';
      const dashboardId = 'export-refs-tags-moved-dashboard';
      await createIn(kbnClient, SOURCE_SPACE, 'tag', tagId, {
        attributes: { name: 'Moved', description: '', color: '#123456' },
      });
      await createIn(kbnClient, SOURCE_SPACE, 'tag', webTagId, {
        attributes: { name: 'Web', description: '', color: '#abcdef' },
      });
      await createIn(
        kbnClient,
        SOURCE_SPACE,
        'dashboard',
        dashboardId,
        storedDashboard('Moved', [tagId, webTagId])
      );
      const { body: exported } = await exportDashboards(apiClient, [dashboardId]);
      const objects = exported.objects as ExportedObject[];
      // Deleted from the source, so their IDs are unused, as in another deployment.
      for (const [type, id] of [
        ['dashboard', dashboardId],
        ['tag', tagId],
        ['tag', webTagId],
      ]) {
        await kbnClient.savedObjects.delete({ type, id, space: SOURCE_SPACE });
      }
      // The populated space has the moved tag under the same ID, and a different tag named "Web".
      await createIn(kbnClient, POPULATED_SPACE, 'tag', tagId, {
        attributes: { name: 'Moved (old)', description: '', color: '#654321' },
      });
      await createIn(kbnClient, POPULATED_SPACE, 'tag', 'export-refs-tags-other-web', {
        attributes: { name: 'Web', description: '', color: '#000000' },
      });

      const response = await importObjects(apiClient, POPULATED_SPACE, {
        objects,
        mode: 'overwrite',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.success).toBe(true);
      expect(
        (response.body.results as ImportResult[]).map(({ type, id, destination_id, status }) => ({
          type,
          id,
          destination_id,
          status,
        }))
      ).toStrictEqual([
        ...[
          { type: 'tag', id: tagId, destination_id: tagId, status: 'overwritten' },
          { type: 'tag', id: webTagId, destination_id: webTagId, status: 'created' },
        ].sort(byId),
        { type: 'dashboard', id: dashboardId, destination_id: dashboardId, status: 'created' },
      ]);
      const { body: moved } = await getTag(apiClient, POPULATED_SPACE, tagId);
      expect(moved.data).toStrictEqual({ name: 'Moved', color: '#123456' });
      // Import doesn't check tag names, so the space now has two tags named "Web", as with legacy import.
      const { body: web } = await getTag(apiClient, POPULATED_SPACE, webTagId);
      expect(web.data.name).toBe('Web');
      const { body: dashboard } = await getDashboard(apiClient, POPULATED_SPACE, dashboardId);
      expect([...(dashboard.data.tags as string[])].sort()).toStrictEqual([tagId, webTagId].sort());
    }
  );

  apiTest('rejects a tag that the tags API would reject on its own', async ({ apiClient }) => {
    const response = await importObjects(apiClient, EMPTY_SPACE, {
      objects: [
        { type: 'tag', id: 'export-refs-tags-invalid', data: { name: 'Bad', color: 'red' } },
      ],
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.success).toBe(false);
    expect(response.body.results).toStrictEqual([
      {
        type: 'tag',
        id: 'export-refs-tags-invalid',
        destination_id: 'export-refs-tags-invalid',
        status: 'error',
        error: { type: 'transform_failed', message: expect.stringContaining('hex color') },
      },
    ]);
  });

  apiTest(
    'reports a tag that no longer exists and exports the dashboard and its other tags',
    async ({ apiClient }) => {
      const response = await exportDashboards(apiClient, [WITH_MISSING_TAG]);

      expect(response).toHaveStatusCode(200);
      expect((response.body.objects as ExportedObject[]).map(toTypeAndId)).toStrictEqual([
        { type: 'tag', id: WEB_TAG },
        { type: 'dashboard', id: WITH_MISSING_TAG },
      ]);
      expect(response.body.problems).toStrictEqual([
        {
          type: 'tag',
          id: MISSING_TAG,
          reason: 'not_found',
          message: expect.stringContaining(MISSING_TAG),
          roots: [WITH_MISSING_TAG],
        },
      ]);
    }
  );

  apiTest(
    'exports tags for a caller who can only read dashboards',
    async ({ apiClient, requestAuth }) => {
      const credentials = await requestAuth.getApiKeyForCustomRole(DASHBOARD_READ_ROLE);

      const response = await exportDashboards(apiClient, [TAGGED], credentials);

      expect(response).toHaveStatusCode(200);
      expect(response.body.problems).toStrictEqual([]);
      expect(
        (response.body.objects as ExportedObject[]).map(toTypeAndId).slice(0, 2).sort(byId)
      ).toStrictEqual([
        { type: 'tag', id: PROD_TAG },
        { type: 'tag', id: WEB_TAG },
      ]);
    }
  );
});
