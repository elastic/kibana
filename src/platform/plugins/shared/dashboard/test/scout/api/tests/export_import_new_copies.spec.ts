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
  ImportReferencedObjectsResponse,
} from '@kbn/saved-objects-management-plugin/common';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, DASHBOARD_API_PATH } from '../fixtures';

const SOURCE_SPACE = 'export-refs-copies-source';
const EMPTY_SPACE = 'export-refs-copies-empty';
// The data view is shared into this space; the tag isn't.
const SHARED_SPACE = 'export-refs-copies-shared';
const SPACES = [SOURCE_SPACE, EMPTY_SPACE, SHARED_SPACE];

// The dashboard has a tag, a control on a data view and a markdown library panel.
const DATA_VIEW = 'export-refs-copies-data-view';
const TAG = 'export-refs-copies-tag';
const MARKDOWN = 'export-refs-copies-markdown';
const DASHBOARD = 'export-refs-copies-dashboard';

const LIBRARY_API_VERSION = '2023-10-31';

const spacePath = (space: string, path: string) => `/s/${space}/${path}`;

type ExportedObject = ExportReferencedObjectsResponse['objects'][number];
type ImportResult = ImportReferencedObjectsResponse['results'][number];

interface DashboardData {
  tags: string[];
  panels: Array<{ type: string; config: { ref_id?: string } }>;
  pinned_panels: Array<{ config: { data_view_id: string } }>;
}

apiTest.describe(
  'dashboards - import with referenced objects as new copies',
  { tag: tags.stateful.classic },
  () => {
    let adminCredentials: RoleApiCredentials;
    let objects: ExportedObject[];

    const request = (
      apiClient: ApiClientFixture,
      method: 'get' | 'put' | 'post',
      space: string,
      path: string,
      { body, version }: { body?: object; version?: string } = {}
    ) =>
      apiClient[method](spacePath(space, path), {
        headers: {
          ...COMMON_HEADERS,
          ...(version && { 'elastic-api-version': version }),
          ...adminCredentials.apiKeyHeader,
        },
        ...(body && { body }),
        responseType: 'json',
      });

    const importAsNewCopies = (apiClient: ApiClientFixture, space: string) =>
      request(apiClient, 'post', space, `${DASHBOARD_API_PATH}/_import`, {
        body: { objects, mode: 'new_copies' } satisfies ImportReferencedObjectsRequest,
      });

    const getDashboard = async (apiClient: ApiClientFixture, space: string, id: string) => {
      const response = await request(apiClient, 'get', space, `${DASHBOARD_API_PATH}/${id}`);
      expect(response).toHaveStatusCode(200);
      return response.body.data as DashboardData;
    };

    const findResult = (results: ImportResult[], type: string) =>
      results.find((result) => result.type === type) as ImportResult;

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
        attributes: { title: 'copies-*', name: 'Copies' },
      });
      expect(
        await request(apiClient, 'post', SOURCE_SPACE, 'api/spaces/_update_objects_spaces', {
          body: {
            objects: [{ type: 'index-pattern', id: DATA_VIEW }],
            spacesToAdd: [SHARED_SPACE],
            spacesToRemove: [],
          },
        })
      ).toHaveStatusCode(200);
      await kbnClient.savedObjects.create({
        type: 'tag',
        id: TAG,
        space: SOURCE_SPACE,
        overwrite: true,
        attributes: { name: 'Copies', description: '', color: '#00AA00' },
      });
      expect(
        await request(apiClient, 'put', SOURCE_SPACE, `api/markdowns/${MARKDOWN}`, {
          body: { title: 'Read me', content: '# Hello' },
          version: LIBRARY_API_VERSION,
        })
      ).toHaveStatusCode(201);
      expect(
        await request(apiClient, 'put', SOURCE_SPACE, `${DASHBOARD_API_PATH}/${DASHBOARD}`, {
          body: {
            title: 'Copies',
            tags: [TAG],
            panels: [
              {
                type: 'markdown',
                grid: { x: 0, y: 0, w: 24, h: 10 },
                config: { ref_id: MARKDOWN },
              },
            ],
            pinned_panels: [
              {
                type: 'options_list_control',
                config: { data_view_id: DATA_VIEW, field_name: 'host.name' },
              },
            ],
          },
        })
      ).toHaveStatusCode(201);

      const exported = await request(
        apiClient,
        'post',
        SOURCE_SPACE,
        `${DASHBOARD_API_PATH}/_export`,
        { body: { ids: [DASHBOARD] } }
      );
      expect(exported).toHaveStatusCode(200);
      expect(exported.body.problems).toStrictEqual([]);
      objects = exported.body.objects as ExportedObject[];
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      for (const id of SPACES) {
        await kbnClient.spaces.delete(id);
      }
    });

    apiTest(
      'imports twice into the same space as two independent dashboards, reusing the data view and tag',
      async ({ apiClient }) => {
        const first = await importAsNewCopies(apiClient, SOURCE_SPACE);
        const second = await importAsNewCopies(apiClient, SOURCE_SPACE);

        for (const response of [first, second]) {
          expect(response).toHaveStatusCode(200);
          expect(response.body.success).toBe(true);
          const results = (response.body.results as ImportResult[]).map(
            ({ type, id, destination_id: destinationId, status }) => ({
              type,
              status,
              hasNewId: destinationId !== id,
            })
          );
          expect(results.sort((a, b) => a.type.localeCompare(b.type))).toStrictEqual([
            { type: 'dashboard', status: 'created', hasNewId: true },
            { type: 'index-pattern', status: 'reused', hasNewId: false },
            { type: 'markdown', status: 'created', hasNewId: true },
            { type: 'tag', status: 'reused', hasNewId: false },
          ]);
        }

        const firstResults = first.body.results as ImportResult[];
        const secondResults = second.body.results as ImportResult[];
        const firstDashboardId = findResult(firstResults, 'dashboard').destination_id;
        const secondDashboardId = findResult(secondResults, 'dashboard').destination_id;
        expect(firstDashboardId).not.toBe(secondDashboardId);

        for (const [dashboardId, results] of [
          [firstDashboardId, firstResults],
          [secondDashboardId, secondResults],
        ] as const) {
          const dashboard = await getDashboard(apiClient, SOURCE_SPACE, dashboardId);
          // Each copy points to its own markdown copy, and to the existing data view and tag.
          expect(dashboard.panels.map(({ config }) => config.ref_id)).toStrictEqual([
            findResult(results, 'markdown').destination_id,
          ]);
          expect(dashboard.tags).toStrictEqual([TAG]);
          expect(dashboard.pinned_panels.map(({ config }) => config.data_view_id)).toStrictEqual([
            DATA_VIEW,
          ]);
        }

        // The original is untouched.
        const original = await getDashboard(apiClient, SOURCE_SPACE, DASHBOARD);
        expect(original.panels.map(({ config }) => config.ref_id)).toStrictEqual([MARKDOWN]);
      }
    );

    apiTest(
      'copies the data view and tag into a space where they do not exist',
      async ({ apiClient }) => {
        const response = await importAsNewCopies(apiClient, EMPTY_SPACE);

        expect(response).toHaveStatusCode(200);
        expect(response.body.success).toBe(true);
        const results = response.body.results as ImportResult[];
        expect(results).toHaveLength(objects.length);
        for (const { id, destination_id: destinationId, status } of results) {
          expect(status).toBe('created');
          expect(destinationId).not.toBe(id);
        }

        const dashboard = await getDashboard(
          apiClient,
          EMPTY_SPACE,
          findResult(results, 'dashboard').destination_id
        );
        expect(dashboard.tags).toStrictEqual([findResult(results, 'tag').destination_id]);
        expect(dashboard.pinned_panels.map(({ config }) => config.data_view_id)).toStrictEqual([
          findResult(results, 'index-pattern').destination_id,
        ]);
        expect(dashboard.panels.map(({ config }) => config.ref_id)).toStrictEqual([
          findResult(results, 'markdown').destination_id,
        ]);
      }
    );

    apiTest(
      'reuses a data view shared into the destination space and copies the tag that is not',
      async ({ apiClient }) => {
        const response = await importAsNewCopies(apiClient, SHARED_SPACE);

        expect(response).toHaveStatusCode(200);
        expect(response.body.success).toBe(true);
        const results = response.body.results as ImportResult[];
        expect(findResult(results, 'index-pattern')).toStrictEqual({
          type: 'index-pattern',
          id: DATA_VIEW,
          destination_id: DATA_VIEW,
          status: 'reused',
        });
        const tagResult = findResult(results, 'tag');
        expect(tagResult.status).toBe('created');
        expect(tagResult.destination_id).not.toBe(TAG);

        const dashboard = await getDashboard(
          apiClient,
          SHARED_SPACE,
          findResult(results, 'dashboard').destination_id
        );
        expect(dashboard.pinned_panels.map(({ config }) => config.data_view_id)).toStrictEqual([
          DATA_VIEW,
        ]);
        expect(dashboard.tags).toStrictEqual([tagResult.destination_id]);
      }
    );

    apiTest(
      'reuses an existing data view even when its exported body is invalid',
      async ({ apiClient }) => {
        const response = await request(
          apiClient,
          'post',
          SOURCE_SPACE,
          `${DASHBOARD_API_PATH}/_import`,
          {
            body: {
              objects: objects.map((object) =>
                object.type === 'index-pattern' ? { ...object, data: {} } : object
              ),
              mode: 'new_copies',
            } satisfies ImportReferencedObjectsRequest,
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.success).toBe(true);
        expect(findResult(response.body.results as ImportResult[], 'index-pattern')).toStrictEqual({
          type: 'index-pattern',
          id: DATA_VIEW,
          destination_id: DATA_VIEW,
          status: 'reused',
        });
      }
    );

    apiTest('rejects an unknown mode', async ({ apiClient }) => {
      const response = await request(
        apiClient,
        'post',
        EMPTY_SPACE,
        `${DASHBOARD_API_PATH}/_import`,
        { body: { objects, mode: 'copy' } }
      );
      expect(response).toHaveStatusCode(400);
    });
  }
);
