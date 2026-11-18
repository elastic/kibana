/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import type {
  ExportReferencedObjectsResponse,
  ImportReferencedObjectsRequest,
} from '@kbn/saved-objects-management-plugin/common';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, DASHBOARD_API_PATH } from '../fixtures';

const SOURCE_SPACE = 'export-refs-decisions-source';
const DESTINATION_SPACE = 'export-refs-decisions-destination';
const SPACES = [SOURCE_SPACE, DESTINATION_SPACE];

const OVERWRITTEN = 'export-refs-decisions-overwritten';
const SKIPPED = 'export-refs-decisions-skipped';
const NEW = 'export-refs-decisions-new';

const spacePath = (space: string, path: string) => `/s/${space}/${path}`;

type ExportedObject = ExportReferencedObjectsResponse['objects'][number];

apiTest.describe(
  'dashboards - import with referenced objects, deciding per conflict',
  { tag: tags.stateful.classic },
  () => {
    let adminCredentials: RoleApiCredentials;
    let objects: ExportedObject[];

    const request = (
      apiClient: ApiClientFixture,
      method: 'get' | 'put' | 'post' | 'delete',
      space: string,
      path: string,
      body?: object
    ) =>
      apiClient[method](spacePath(space, path), {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        ...(body && { body }),
        responseType: 'json',
      });

    const importObjects = (apiClient: ApiClientFixture, body: ImportReferencedObjectsRequest) =>
      request(apiClient, 'post', DESTINATION_SPACE, `${DASHBOARD_API_PATH}/_import`, body);

    const getTitle = async (apiClient: ApiClientFixture, id: string) => {
      const response = await request(
        apiClient,
        'get',
        DESTINATION_SPACE,
        `${DASHBOARD_API_PATH}/${id}`
      );
      expect(response).toHaveStatusCode(200);
      return response.body.data.title as string;
    };

    apiTest.beforeAll(async ({ apiClient, kbnClient, requestAuth }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      for (const id of SPACES) {
        await kbnClient.spaces.create({ id, name: id });
      }
      for (const id of [OVERWRITTEN, SKIPPED, NEW]) {
        expect(
          await request(apiClient, 'put', SOURCE_SPACE, `${DASHBOARD_API_PATH}/${id}`, {
            title: `Original ${id}`,
          })
        ).toHaveStatusCode(201);
      }
      const exported = await request(
        apiClient,
        'post',
        SOURCE_SPACE,
        `${DASHBOARD_API_PATH}/_export`,
        { ids: [OVERWRITTEN, SKIPPED, NEW] }
      );
      expect(exported).toHaveStatusCode(200);
      objects = exported.body.objects;
      // Deleted so their IDs are unused, as in another deployment; otherwise core gives them new IDs.
      for (const id of [OVERWRITTEN, SKIPPED, NEW]) {
        await kbnClient.savedObjects.delete({ type: 'dashboard', id, space: SOURCE_SPACE });
      }
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      for (const id of SPACES) {
        await kbnClient.spaces.delete(id);
      }
    });

    apiTest(
      'overwrites and skips conflicts as decided, without writing the other objects again',
      async ({ apiClient }) => {
        // The first import writes two of the dashboards.
        const first = await importObjects(apiClient, {
          objects: objects.filter(({ id }) => id !== NEW),
          mode: 'request_action',
        });
        expect(first).toHaveStatusCode(200);
        expect(first.body.success).toBe(true);

        // The second import changes every title, so the existing two conflict and the third is created.
        const changed = objects.map((object) => ({
          ...object,
          data: { ...object.data, title: `Changed ${object.id}` },
        }));
        const second = await importObjects(apiClient, { objects: changed, mode: 'request_action' });
        expect(second).toHaveStatusCode(200);
        expect(second.body.results).toStrictEqual([
          { type: 'dashboard', id: OVERWRITTEN, destination_id: OVERWRITTEN, status: 'conflict' },
          { type: 'dashboard', id: SKIPPED, destination_id: SKIPPED, status: 'conflict' },
          { type: 'dashboard', id: NEW, destination_id: NEW, status: 'created' },
        ]);

        // Changed after the second import, so writing it again would be visible.
        expect(
          await request(apiClient, 'put', DESTINATION_SPACE, `${DASHBOARD_API_PATH}/${NEW}`, {
            title: 'Edited in the destination',
          })
        ).toHaveStatusCode(200);

        const decided = await importObjects(apiClient, {
          objects: changed,
          mode: 'request_action',
          decisions: [
            { type: 'dashboard', id: OVERWRITTEN, action: 'overwrite' },
            { type: 'dashboard', id: SKIPPED, action: 'skip' },
          ],
        });
        expect(decided).toHaveStatusCode(200);
        expect(decided.body).toStrictEqual({
          success: true,
          results: [
            {
              type: 'dashboard',
              id: OVERWRITTEN,
              destination_id: OVERWRITTEN,
              status: 'overwritten',
            },
            { type: 'dashboard', id: SKIPPED, destination_id: SKIPPED, status: 'skipped' },
          ],
          warnings: [],
        });

        expect(await getTitle(apiClient, OVERWRITTEN)).toBe(`Changed ${OVERWRITTEN}`);
        expect(await getTitle(apiClient, SKIPPED)).toBe(`Original ${SKIPPED}`);
        expect(await getTitle(apiClient, NEW)).toBe('Edited in the destination');
      }
    );

    apiTest('rejects decisions in any mode but request_action', async ({ apiClient }) => {
      for (const mode of ['overwrite', 'new_copies'] as const) {
        const response = await importObjects(apiClient, {
          objects,
          mode,
          decisions: [{ type: 'dashboard', id: OVERWRITTEN, action: 'overwrite' }],
        });
        expect(response).toHaveStatusCode(400);
      }
    });

    apiTest('rejects a decision for an object that is not imported', async ({ apiClient }) => {
      const response = await importObjects(apiClient, {
        objects,
        mode: 'request_action',
        decisions: [{ type: 'dashboard', id: 'export-refs-decisions-unknown', action: 'skip' }],
      });
      expect(response).toHaveStatusCode(400);
    });
  }
);
