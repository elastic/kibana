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

const SOURCE_SPACE = 'export-refs-missing-source';
const MODE_SPACES = {
  request_action: 'export-refs-missing-request-action',
  overwrite: 'export-refs-missing-overwrite',
  new_copies: 'export-refs-missing-new-copies',
} as const;
const DECISIONS_SPACE = 'export-refs-missing-decisions';
const SPACES = [SOURCE_SPACE, ...Object.values(MODE_SPACES), DECISIONS_SPACE];

const DATA_VIEW = 'export-refs-missing-data-view';
const DASHBOARD = 'export-refs-missing-dashboard';

const missingDataViewWarning = (dashboardId: string) => ({
  type: 'missing_reference',
  from: { type: 'dashboard', id: dashboardId },
  reference: { type: 'index-pattern', id: DATA_VIEW },
});

const spacePath = (space: string, path: string) => `/s/${space}/${path}`;

type ExportedObject = ExportReferencedObjectsResponse['objects'][number];

apiTest.describe(
  'dashboards - import with referenced objects that are missing',
  { tag: tags.stateful.classic },
  () => {
    let adminCredentials: RoleApiCredentials;
    // The export without its data view, as if it had been left out at the source.
    let objects: ExportedObject[];

    // Dashboard IDs are unique across spaces, so each test imports the dashboard under its own ID.
    const exportedAs = (dashboardId: string): ExportedObject[] =>
      objects.map((object) => ({ ...object, id: dashboardId }));

    const request = (
      apiClient: ApiClientFixture,
      method: 'get' | 'put' | 'post',
      space: string,
      path: string,
      body?: object
    ) =>
      apiClient[method](spacePath(space, path), {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        ...(body && { body }),
        responseType: 'json',
      });

    const importObjects = (
      apiClient: ApiClientFixture,
      space: string,
      body: ImportReferencedObjectsRequest
    ) => request(apiClient, 'post', space, `${DASHBOARD_API_PATH}/_import`, body);

    apiTest.beforeAll(async ({ apiClient, kbnClient, requestAuth }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      for (const id of SPACES) {
        await kbnClient.spaces.create({ id, name: id });
      }
      await kbnClient.savedObjects.create({
        type: 'index-pattern',
        id: DATA_VIEW,
        space: SOURCE_SPACE,
        overwrite: true,
        attributes: { title: 'missing-*', name: 'Missing' },
      });
      expect(
        await request(apiClient, 'put', SOURCE_SPACE, `${DASHBOARD_API_PATH}/${DASHBOARD}`, {
          title: 'With a data view left out',
          pinned_panels: [
            {
              type: 'options_list_control',
              config: { data_view_id: DATA_VIEW, field_name: 'host.name' },
            },
          ],
        })
      ).toHaveStatusCode(201);

      const exported = await request(
        apiClient,
        'post',
        SOURCE_SPACE,
        `${DASHBOARD_API_PATH}/_export`,
        { ids: [DASHBOARD] }
      );
      expect(exported).toHaveStatusCode(200);
      objects = (exported.body.objects as ExportedObject[]).filter(
        ({ type }) => type !== 'index-pattern'
      );
      expect(objects.map(({ type, id }) => ({ type, id }))).toStrictEqual([
        { type: 'dashboard', id: DASHBOARD },
      ]);
      // Deleted so their IDs are unused, as in another deployment; otherwise core gives them new IDs.
      await kbnClient.savedObjects.delete({
        type: 'dashboard',
        id: DASHBOARD,
        space: SOURCE_SPACE,
      });
      await kbnClient.savedObjects.delete({
        type: 'index-pattern',
        id: DATA_VIEW,
        space: SOURCE_SPACE,
      });
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      for (const id of SPACES) {
        await kbnClient.spaces.delete(id);
      }
    });

    for (const [mode, space] of Object.entries(MODE_SPACES) as Array<
      [ImportReferencedObjectsRequest['mode'], string]
    >) {
      apiTest(
        `imports a dashboard whose data view is missing alongside one without, and warns about it (${mode})`,
        async ({ apiClient }) => {
          const dashboardId = `${DASHBOARD}-${mode}`;
          const cleanId = `${dashboardId}-clean`;
          const response = await importObjects(apiClient, space, {
            objects: [
              ...exportedAs(dashboardId),
              { type: 'dashboard', id: cleanId, data: { title: 'Without references' } },
            ],
            mode,
          });

          expect(response).toHaveStatusCode(200);
          expect(response.body.success).toBe(true);
          expect(response.body.warnings).toStrictEqual([missingDataViewWarning(dashboardId)]);
          for (const [result, id] of [
            [response.body.results[0], dashboardId],
            [response.body.results[1], cleanId],
          ]) {
            expect(result.status).toBe('created');
            expect(result.destination_id === id).toBe(mode !== 'new_copies');
            expect(
              await request(
                apiClient,
                'get',
                space,
                `${DASHBOARD_API_PATH}/${result.destination_id}`
              )
            ).toHaveStatusCode(200);
          }
        }
      );
    }

    apiTest(
      'overwrites a conflicting dashboard whose data view is missing',
      async ({ apiClient }) => {
        const dashboardId = `${DASHBOARD}-decisions`;
        const first = await importObjects(apiClient, DECISIONS_SPACE, {
          objects: exportedAs(dashboardId),
          mode: 'request_action',
        });
        expect(first).toHaveStatusCode(200);

        const changed = exportedAs(dashboardId).map((object) => ({
          ...object,
          data: { ...object.data, title: 'Changed' },
        }));
        const second = await importObjects(apiClient, DECISIONS_SPACE, {
          objects: changed,
          mode: 'request_action',
        });
        expect(second).toHaveStatusCode(200);
        expect(second.body.results).toStrictEqual([
          { type: 'dashboard', id: dashboardId, destination_id: dashboardId, status: 'conflict' },
        ]);
        expect(second.body.warnings).toStrictEqual([missingDataViewWarning(dashboardId)]);

        const decided = await importObjects(apiClient, DECISIONS_SPACE, {
          objects: changed,
          mode: 'request_action',
          decisions: [{ type: 'dashboard', id: dashboardId, action: 'overwrite' }],
        });
        expect(decided).toHaveStatusCode(200);
        expect(decided.body).toStrictEqual({
          success: true,
          results: [
            {
              type: 'dashboard',
              id: dashboardId,
              destination_id: dashboardId,
              status: 'overwritten',
            },
          ],
          warnings: [missingDataViewWarning(dashboardId)],
        });

        const dashboard = await request(
          apiClient,
          'get',
          DECISIONS_SPACE,
          `${DASHBOARD_API_PATH}/${dashboardId}`
        );
        expect(dashboard).toHaveStatusCode(200);
        expect(dashboard.body.data.title).toBe('Changed');
      }
    );
  }
);
