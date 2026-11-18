/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectTypeIdTuple } from '@kbn/core/server';
import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import type {
  ExportReferencedObjectsResponse,
  ImportReferencedObjectsRequest,
  ImportReferencedObjectsResponse,
} from '@kbn/saved-objects-management-plugin/common';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, DASHBOARD_API_PATH } from '../fixtures';

const SOURCE_SPACE = 'export-refs-library-source';
const EMPTY_SPACE = 'export-refs-library-empty';
const SPACES = [SOURCE_SPACE, EMPTY_SPACE];

const DATA_VIEW = 'export-refs-library-logs';
const TAG = 'export-refs-library-tag';
const LENS = 'export-refs-library-lens';
const SESSION = 'export-refs-library-session';
const ESQL_LENS = 'export-refs-library-esql-lens';
const DASHBOARD = 'export-refs-library-dashboard';
const ESQL_DASHBOARD = 'export-refs-library-esql-dashboard';

const LIBRARY_API_VERSION = '2023-10-31';

const spacePath = (space: string, path: string) => `/s/${space}/${path}`;

type ExportedObject = ExportReferencedObjectsResponse['objects'][number];
type ImportResult = ImportReferencedObjectsResponse['results'][number];

interface Panel {
  type: string;
  config: { ref_id?: string };
}

apiTest.describe(
  'dashboards - export and import with Lens and Discover session library items',
  { tag: tags.stateful.classic },
  () => {
    let adminCredentials: RoleApiCredentials;

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

    const exportDashboards = (apiClient: ApiClientFixture, ids: string[]) =>
      request(apiClient, 'post', SOURCE_SPACE, `${DASHBOARD_API_PATH}/_export`, {
        body: { ids },
      });

    const importObjects = (
      apiClient: ApiClientFixture,
      space: string,
      body: Pick<ImportReferencedObjectsRequest, 'objects'>
    ) => request(apiClient, 'post', space, `${DASHBOARD_API_PATH}/_import`, { body });

    const getLens = (apiClient: ApiClientFixture, space: string, id: string) =>
      request(apiClient, 'get', space, `api/visualizations/${id}`, {
        version: LIBRARY_API_VERSION,
      });

    const getSession = (apiClient: ApiClientFixture, space: string, id: string) =>
      request(apiClient, 'get', space, `api/discover_sessions/${id}`, {
        version: LIBRARY_API_VERSION,
      });

    const libraryPanels = (lensId: string, sessionId: string) => [
      { type: 'vis', grid: { x: 0, y: 0, w: 24, h: 10 }, config: { ref_id: lensId } },
      {
        type: 'discover_session',
        grid: { x: 24, y: 0, w: 24, h: 10 },
        config: { ref_id: sessionId },
      },
    ];

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
        attributes: { title: 'logs-*', name: 'Logs', timeFieldName: '@timestamp' },
        references: [],
      });
      await kbnClient.savedObjects.create({
        type: 'tag',
        id: TAG,
        space: SOURCE_SPACE,
        overwrite: true,
        attributes: { name: 'Library', description: '', color: '#772299' },
        references: [],
      });

      // Created through their public APIs, so the stored items are what users have.
      const lens = await request(apiClient, 'put', SOURCE_SPACE, `api/visualizations/${LENS}`, {
        version: LIBRARY_API_VERSION,
        body: {
          type: 'metric',
          title: 'Total requests',
          data_source: { type: 'data_view_reference', ref_id: DATA_VIEW },
          metrics: [{ type: 'primary', operation: 'count' }],
          tags: [TAG],
        },
      });
      expect(lens).toHaveStatusCode(201);
      const session = await request(
        apiClient,
        'put',
        SOURCE_SPACE,
        `api/discover_sessions/${SESSION}`,
        {
          version: LIBRARY_API_VERSION,
          body: {
            title: 'Logs session',
            tags: [TAG],
            tabs: [
              {
                id: 'main',
                label: 'Main',
                data_source: { type: 'data_view_reference', ref_id: DATA_VIEW },
              },
            ],
          },
        }
      );
      expect(session).toHaveStatusCode(201);

      // The public API doesn't create ES|QL library items, so this one is stored directly.
      await kbnClient.savedObjects.create({
        type: 'lens',
        id: ESQL_LENS,
        space: SOURCE_SPACE,
        overwrite: true,
        attributes: {
          title: 'ES|QL count',
          visualizationType: 'lnsMetric',
          version: 3,
          state: {
            datasourceStates: {
              textBased: {
                layers: {
                  layer: {
                    index: 'logs-esql',
                    query: { esql: 'FROM logs-* | STATS count = COUNT(*)' },
                    columns: [{ columnId: 'count', fieldName: 'count', meta: { type: 'number' } }],
                  },
                },
              },
            },
            visualization: { layerId: 'layer', layerType: 'data', metricAccessor: 'count' },
            query: { esql: 'FROM logs-* | STATS count = COUNT(*)' },
            filters: [],
          },
        },
        references: [],
      });

      for (const [id, panels] of [
        [DASHBOARD, libraryPanels(LENS, SESSION)],
        [
          ESQL_DASHBOARD,
          [{ type: 'vis', grid: { x: 0, y: 0, w: 24, h: 10 }, config: { ref_id: ESQL_LENS } }],
        ],
      ] as const) {
        const dashboard = await request(
          apiClient,
          'put',
          SOURCE_SPACE,
          `${DASHBOARD_API_PATH}/${id}`,
          { body: { title: id, panels } }
        );
        expect(dashboard).toHaveStatusCode(201);
      }
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      for (const id of SPACES) {
        await kbnClient.spaces.delete(id);
      }
    });

    const toTypeAndId = ({ type, id }: SavedObjectTypeIdTuple) => ({ type, id });

    apiTest(
      'exports by-reference Lens and Discover session items with their data view and tag, each once and before what points to them',
      async ({ apiClient }) => {
        const response = await exportDashboards(apiClient, [DASHBOARD]);

        expect(response).toHaveStatusCode(200);
        expect(response.body.problems).toStrictEqual([]);
        const objects = (response.body.objects as ExportedObject[]).map(toTypeAndId);
        expect(objects).toHaveLength(5);
        const position = (type: string, id: string) =>
          objects.findIndex((object) => object.type === type && object.id === id);
        for (const [type, id] of [
          ['index-pattern', DATA_VIEW],
          ['tag', TAG],
        ]) {
          expect(position(type, id)).toBeLessThan(position('lens', LENS));
          expect(position(type, id)).toBeLessThan(position('search', SESSION));
        }
        expect(position('lens', LENS)).toBeLessThan(position('dashboard', DASHBOARD));
        expect(position('search', SESSION)).toBeLessThan(position('dashboard', DASHBOARD));

        const { body: lens } = await getLens(apiClient, SOURCE_SPACE, LENS);
        const { body: session } = await getSession(apiClient, SOURCE_SPACE, SESSION);
        const exported = response.body.objects as ExportedObject[];
        // Each item is exported as the body its public GET returns.
        expect(exported[position('lens', LENS)].data).toStrictEqual(lens.data);
        expect(exported[position('search', SESSION)].data).toStrictEqual(session.data);
      }
    );

    apiTest(
      'moves a dashboard with both panel types into an empty space, where it shows the same panels',
      async ({ apiClient }) => {
        const { body: exported } = await exportDashboards(apiClient, [DASHBOARD]);

        // The IDs exist in the source space, so core gives them new IDs, like Copy to space.
        const response = await importObjects(apiClient, EMPTY_SPACE, {
          objects: exported.objects as ExportedObject[],
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.success).toBe(true);
        const results = response.body.results as ImportResult[];
        expect(results.every(({ status }) => status === 'created')).toBe(true);
        const destinationId = (type: string, id: string) =>
          results.find((result) => result.type === type && result.id === id)?.destination_id ?? '';

        const lensId = destinationId('lens', LENS);
        const sessionId = destinationId('search', SESSION);
        const dataViewId = destinationId('index-pattern', DATA_VIEW);
        const tagId = destinationId('tag', TAG);

        const { body: dashboard } = await request(
          apiClient,
          'get',
          EMPTY_SPACE,
          `${DASHBOARD_API_PATH}/${destinationId('dashboard', DASHBOARD)}`
        );
        expect(
          (dashboard.data.panels as Panel[]).map(({ type, config }) => ({
            type,
            ref_id: config.ref_id,
          }))
        ).toStrictEqual([
          { type: 'vis', ref_id: lensId },
          { type: 'discover_session', ref_id: sessionId },
        ]);

        const lens = await getLens(apiClient, EMPTY_SPACE, lensId);
        expect(lens).toHaveStatusCode(200);
        expect(lens.body.data).toStrictEqual(
          expect.objectContaining({
            title: 'Total requests',
            data_source: { type: 'data_view_reference', ref_id: dataViewId },
            tags: [tagId],
          })
        );

        const session = await getSession(apiClient, EMPTY_SPACE, sessionId);
        expect(session).toHaveStatusCode(200);
        expect(session.body.data.title).toBe('Logs session');
        expect(session.body.data.tags).toStrictEqual([tagId]);
        expect(session.body.data.tabs[0].data_source).toStrictEqual({
          type: 'data_view_reference',
          ref_id: dataViewId,
        });
      }
    );

    apiTest(
      'reports an ES|QL Lens item, which the public GET rejects, and exports the dashboard',
      async ({ apiClient }) => {
        const response = await exportDashboards(apiClient, [ESQL_DASHBOARD]);

        expect(response).toHaveStatusCode(200);
        expect((response.body.objects as ExportedObject[]).map(toTypeAndId)).toStrictEqual([
          { type: 'dashboard', id: ESQL_DASHBOARD },
        ]);
        expect(response.body.problems).toStrictEqual([
          {
            type: 'lens',
            id: ESQL_LENS,
            reason: 'transform_failed',
            message: expect.stringContaining('ES|QL charts are not supported in by-ref Lens'),
            roots: [ESQL_DASHBOARD],
          },
        ]);
      }
    );
  }
);
