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
  ImportReferencedObjectsResponse,
} from '@kbn/saved-objects-management-plugin/common';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, DASHBOARD_API_PATH } from '../fixtures';

const SOURCE_SPACE = 'export-refs-dv-source';
const EMPTY_SPACE = 'export-refs-dv-empty';
const POPULATED_SPACE = 'export-refs-dv-populated';
const SPACES = [SOURCE_SPACE, EMPTY_SPACE, POPULATED_SPACE];

const LOGS_DATA_VIEW = 'export-refs-dv-logs';
const SCRIPTED_DATA_VIEW = 'export-refs-dv-scripted';
const LEGACY_VIS_DATA_VIEW = 'export-refs-dv-legacy-vis';
const MISSING_DATA_VIEW = 'export-refs-dv-missing';
const LEGACY_VIS = 'export-refs-dv-legacy-visualization';
const GRAPH_WORKSPACE = 'export-refs-dv-graph';
const CONTROL_DATA_VIEW = 'export-refs-dv-control';

const LOGS_FIRST = 'export-refs-dv-logs-first';
const LOGS_SECOND = 'export-refs-dv-logs-second';
const SCRIPTED_FIRST = 'export-refs-dv-scripted-first';
const SCRIPTED_SECOND = 'export-refs-dv-scripted-second';
const WITH_LEGACY_VIS = 'export-refs-dv-with-legacy-vis';
const WITH_MISSING = 'export-refs-dv-with-missing';
const WITH_GRAPH = 'export-refs-dv-with-graph';
const WITH_CONTROL = 'export-refs-dv-with-control';

// Dashboard read covers data views, but not graph workspaces.
const DASHBOARD_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { dashboard: ['read'] }, spaces: ['*'] }],
};

const spacePath = (space: string, path: string) => `/s/${space}/${path}`;

const FILTER_REF_NAME = 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index';

// A stored dashboard whose only filter uses a data view, plus any extra references.
const storedDashboardWithFilter = (
  title: string,
  dataViewId: string,
  { panels = [], references = [] }: { panels?: object[]; references?: SavedObjectReference[] } = {}
) => ({
  attributes: {
    title,
    panelsJSON: JSON.stringify(panels),
    optionsJSON: '{}',
    timeRestore: false,
    version: 1,
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify({
        query: { query: '', language: 'kuery' },
        filter: [
          {
            meta: { key: 'host.name', type: 'exists', indexRefName: FILTER_REF_NAME },
            query: { exists: { field: 'host.name' } },
          },
        ],
      }),
    },
  },
  references: [{ type: 'index-pattern', id: dataViewId, name: FILTER_REF_NAME }, ...references],
});

type ExportedObject = ExportReferencedObjectsResponse['objects'][number];
type ImportResult = ImportReferencedObjectsResponse['results'][number];

apiTest.describe(
  'dashboards - export and import with data views',
  { tag: tags.stateful.classic },
  () => {
    let adminCredentials: RoleApiCredentials;

    const createInSource = (
      kbnClient: KbnClient,
      type: string,
      id: string,
      { attributes, references = [] }: { attributes: object; references?: SavedObjectReference[] }
    ) =>
      kbnClient.savedObjects.create({
        type,
        id,
        space: SOURCE_SPACE,
        overwrite: true,
        attributes,
        references,
      });

    apiTest.beforeAll(async ({ apiClient, kbnClient, requestAuth }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      for (const id of SPACES) {
        await kbnClient.spaces.create({ id, name: id });
      }

      await createInSource(kbnClient, 'index-pattern', LOGS_DATA_VIEW, {
        attributes: { title: 'logs-*', name: 'Logs', timeFieldName: '@timestamp' },
      });
      await createInSource(kbnClient, 'index-pattern', SCRIPTED_DATA_VIEW, {
        attributes: {
          title: 'scripted-*',
          fields: JSON.stringify([
            { name: 'doubled', type: 'number', scripted: true, script: 'doc.x.value * 2' },
          ]),
        },
      });
      await createInSource(kbnClient, 'index-pattern', LEGACY_VIS_DATA_VIEW, {
        // Data views saved without a name store an empty one.
        attributes: { title: 'legacy-vis-*', name: '' },
      });
      await createInSource(kbnClient, 'visualization', LEGACY_VIS, {
        attributes: {
          title: 'Legacy visualization',
          visState: JSON.stringify({ type: 'markdown', params: { markdown: 'hi' }, aggs: [] }),
          uiStateJSON: '{}',
          description: '',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            }),
          },
        },
        references: [
          {
            type: 'index-pattern',
            id: LEGACY_VIS_DATA_VIEW,
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          },
        ],
      });
      await createInSource(kbnClient, 'graph-workspace', GRAPH_WORKSPACE, {
        attributes: { title: 'Graph', numLinks: 0, numVertices: 0, version: 1, wsState: '{}' },
      });

      await createInSource(
        kbnClient,
        'dashboard',
        LOGS_FIRST,
        storedDashboardWithFilter('Logs first', LOGS_DATA_VIEW)
      );
      await createInSource(
        kbnClient,
        'dashboard',
        LOGS_SECOND,
        storedDashboardWithFilter('Logs second', LOGS_DATA_VIEW)
      );
      await createInSource(
        kbnClient,
        'dashboard',
        SCRIPTED_FIRST,
        storedDashboardWithFilter('Scripted first', SCRIPTED_DATA_VIEW)
      );
      await createInSource(
        kbnClient,
        'dashboard',
        SCRIPTED_SECOND,
        storedDashboardWithFilter('Scripted second', SCRIPTED_DATA_VIEW)
      );
      await createInSource(
        kbnClient,
        'dashboard',
        WITH_LEGACY_VIS,
        storedDashboardWithFilter('With legacy visualization', LOGS_DATA_VIEW, {
          panels: [
            {
              type: 'visualization',
              panelIndex: 'p1',
              panelRefName: 'panel_p1',
              gridData: { x: 0, y: 0, w: 24, h: 15, i: 'p1' },
              embeddableConfig: {},
            },
          ],
          references: [{ type: 'visualization', id: LEGACY_VIS, name: 'p1:panel_p1' }],
        })
      );
      await createInSource(
        kbnClient,
        'dashboard',
        WITH_MISSING,
        storedDashboardWithFilter('With missing data view', MISSING_DATA_VIEW)
      );
      await createInSource(
        kbnClient,
        'dashboard',
        WITH_GRAPH,
        storedDashboardWithFilter('With graph', LOGS_DATA_VIEW, {
          references: [{ type: 'graph-workspace', id: GRAPH_WORKSPACE, name: 'graph' }],
        })
      );
      await createInSource(kbnClient, 'index-pattern', CONTROL_DATA_VIEW, {
        attributes: { title: 'control-*', name: 'Control' },
      });
      const controlResponse = await apiClient.put(
        spacePath(SOURCE_SPACE, `${DASHBOARD_API_PATH}/${WITH_CONTROL}`),
        {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          body: {
            title: 'With control',
            pinned_panels: [
              {
                type: 'options_list_control',
                config: { data_view_id: CONTROL_DATA_VIEW, field_name: 'host.name' },
              },
            ],
          },
          responseType: 'json',
        }
      );
      expect(controlResponse).toHaveStatusCode(201);
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
      body: { objects: ExportedObject[]; mode?: string }
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

    const getDataView = (apiClient: ApiClientFixture, space: string, id: string) =>
      apiClient.get(spacePath(space, `api/data_views/v2/${id}`), {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      });

    const toTypeAndId = ({ type, id }: SavedObjectTypeIdTuple) => ({ type, id });

    apiTest(
      'exports a data view shared by two dashboards once, before the dashboards',
      async ({ apiClient }) => {
        const response = await exportDashboards(apiClient, [LOGS_FIRST, LOGS_SECOND]);

        expect(response).toHaveStatusCode(200);
        expect(response.body.problems).toStrictEqual([]);
        expect((response.body.objects as ExportedObject[]).map(toTypeAndId)).toStrictEqual([
          { type: 'index-pattern', id: LOGS_DATA_VIEW },
          { type: 'dashboard', id: LOGS_FIRST },
          { type: 'dashboard', id: LOGS_SECOND },
        ]);
        const [dataView, dashboard] = response.body.objects as ExportedObject[];
        expect(dataView.data).toStrictEqual({
          name: 'Logs',
          index_pattern: 'logs-*',
          time_field: '@timestamp',
        });
        expect(dashboard.data.filters).toStrictEqual([
          expect.objectContaining({ data_view_id: LOGS_DATA_VIEW }),
        ]);
      }
    );

    apiTest(
      'moves a dashboard and its data view into an empty space, then reports both as conflicts in the populated space',
      async ({ apiClient }) => {
        const { body: exported } = await exportDashboards(apiClient, [LOGS_FIRST]);
        const objects = exported.objects as ExportedObject[];

        // The IDs exist in the source space, so core gives them new IDs, like Copy to space.
        const first = await importObjects(apiClient, EMPTY_SPACE, { objects });
        expect(first).toHaveStatusCode(200);
        expect(first.body.success).toBe(true);
        const [dataViewResult, dashboardResult] = first.body.results as ImportResult[];
        expect(dataViewResult).toStrictEqual(
          expect.objectContaining({ type: 'index-pattern', id: LOGS_DATA_VIEW, status: 'created' })
        );
        expect(dashboardResult).toStrictEqual(
          expect.objectContaining({ type: 'dashboard', id: LOGS_FIRST, status: 'created' })
        );

        // The dashboard points to the data view under its destination ID.
        const { body: dashboard } = await getDashboard(
          apiClient,
          EMPTY_SPACE,
          dashboardResult.destination_id
        );
        expect(dashboard.data.filters).toStrictEqual([
          expect.objectContaining({ data_view_id: dataViewResult.destination_id }),
        ]);
        const { body: dataView } = await getDataView(
          apiClient,
          EMPTY_SPACE,
          dataViewResult.destination_id
        );
        expect(dataView.data).toStrictEqual(
          expect.objectContaining({ name: 'Logs', index_pattern: 'logs-*' })
        );

        // Imported again with the destination IDs, into a space that now has them.
        const destinationObjects = objects.map((object, index) => ({
          ...object,
          id: (first.body.results as ImportResult[])[index].destination_id,
          data:
            object.type === 'dashboard'
              ? {
                  ...object.data,
                  filters: [
                    {
                      ...(object.data.filters as object[])[0],
                      data_view_id: dataViewResult.destination_id,
                    },
                  ],
                }
              : object.data,
        }));
        const second = await importObjects(apiClient, EMPTY_SPACE, {
          objects: destinationObjects,
        });
        expect(second).toHaveStatusCode(200);
        expect(second.body.success).toBe(false);
        expect((second.body.results as ImportResult[]).map(({ status }) => status)).toStrictEqual([
          'conflict',
          'conflict',
        ]);

        const overwritten = await importObjects(apiClient, EMPTY_SPACE, {
          objects: destinationObjects,
          mode: 'overwrite',
        });
        expect(overwritten).toHaveStatusCode(200);
        expect(
          (overwritten.body.results as ImportResult[]).map(({ status }) => status)
        ).toStrictEqual(['overwritten', 'overwritten']);
      }
    );

    apiTest(
      'moves a dashboard and its data view with their IDs into a space that already has the data view',
      async ({ apiClient, kbnClient }) => {
        const dataViewId = 'export-refs-dv-moved';
        const dashboardId = 'export-refs-dv-moved-dashboard';
        await createInSource(kbnClient, 'index-pattern', dataViewId, {
          attributes: { title: 'moved-*' },
        });
        await createInSource(
          kbnClient,
          'dashboard',
          dashboardId,
          storedDashboardWithFilter('Moved', dataViewId)
        );
        const { body: exported } = await exportDashboards(apiClient, [dashboardId]);
        const objects = exported.objects as ExportedObject[];
        // Deleted from the source, so their IDs are unused, as in another deployment.
        await kbnClient.savedObjects.delete({
          type: 'dashboard',
          id: dashboardId,
          space: SOURCE_SPACE,
        });
        await kbnClient.savedObjects.delete({
          type: 'index-pattern',
          id: dataViewId,
          space: SOURCE_SPACE,
        });
        // The populated space already has the data view, under the same ID.
        await kbnClient.savedObjects.create({
          type: 'index-pattern',
          id: dataViewId,
          space: POPULATED_SPACE,
          overwrite: true,
          attributes: { title: 'populated-*', name: 'Populated' },
        });

        const response = await importObjects(apiClient, POPULATED_SPACE, { objects });

        expect(response).toHaveStatusCode(200);
        expect(response.body.results).toStrictEqual([
          { type: 'index-pattern', id: dataViewId, destination_id: dataViewId, status: 'conflict' },
          { type: 'dashboard', id: dashboardId, destination_id: dashboardId, status: 'created' },
        ]);
        const { body: dataView } = await getDataView(apiClient, POPULATED_SPACE, dataViewId);
        expect(dataView.data.index_pattern).toBe('populated-*');
        const { body: dashboard } = await getDashboard(apiClient, POPULATED_SPACE, dashboardId);
        // The dashboard points to the data view already there; the PUT transform adds an empty description.
        expect(dashboard.data).toStrictEqual(expect.objectContaining(objects[1].data));
      }
    );

    apiTest(
      "exports a control's data view and points the control to it in another space",
      async ({ apiClient }) => {
        const { body: exported } = await exportDashboards(apiClient, [WITH_CONTROL]);
        const objects = exported.objects as ExportedObject[];
        expect(objects.map(toTypeAndId)).toStrictEqual([
          { type: 'index-pattern', id: CONTROL_DATA_VIEW },
          { type: 'dashboard', id: WITH_CONTROL },
        ]);

        // The IDs exist in the source space, so the destination gets new ones.
        const response = await importObjects(apiClient, EMPTY_SPACE, { objects });

        expect(response).toHaveStatusCode(200);
        const [dataViewResult, dashboardResult] = response.body.results as ImportResult[];
        expect(dataViewResult.destination_id).not.toBe(CONTROL_DATA_VIEW);
        const { body: dashboard } = await getDashboard(
          apiClient,
          EMPTY_SPACE,
          dashboardResult.destination_id
        );
        expect(dashboard.data.pinned_panels).toStrictEqual([
          expect.objectContaining({
            config: expect.objectContaining({ data_view_id: dataViewResult.destination_id }),
          }),
        ]);
      }
    );

    apiTest(
      'reports a data view with scripted fields once, for every dashboard that uses it',
      async ({ apiClient }) => {
        const response = await exportDashboards(apiClient, [SCRIPTED_FIRST, SCRIPTED_SECOND]);

        expect(response).toHaveStatusCode(200);
        expect((response.body.objects as ExportedObject[]).map(toTypeAndId)).toStrictEqual([
          { type: 'dashboard', id: SCRIPTED_FIRST },
          { type: 'dashboard', id: SCRIPTED_SECOND },
        ]);
        expect(response.body.problems).toStrictEqual([
          {
            type: 'index-pattern',
            id: SCRIPTED_DATA_VIEW,
            reason: 'invalid_body',
            message: expect.stringContaining('scripted_fields'),
            roots: [SCRIPTED_FIRST, SCRIPTED_SECOND],
          },
        ]);
      }
    );

    apiTest(
      'reports an unsupported type and still exports the data view reached only through it',
      async ({ apiClient }) => {
        const response = await exportDashboards(apiClient, [WITH_LEGACY_VIS]);

        expect(response).toHaveStatusCode(200);
        const objects = (response.body.objects as ExportedObject[]).map(toTypeAndId);
        // Both data views come before the dashboard; their order between them isn't fixed.
        expect(objects[2]).toStrictEqual({ type: 'dashboard', id: WITH_LEGACY_VIS });
        expect(objects.slice(0, 2).sort((a, b) => a.id.localeCompare(b.id))).toStrictEqual([
          { type: 'index-pattern', id: LEGACY_VIS_DATA_VIEW },
          { type: 'index-pattern', id: LOGS_DATA_VIEW },
        ]);
        expect(response.body.problems).toStrictEqual([
          {
            type: 'visualization',
            id: LEGACY_VIS,
            reason: 'unsupported_type',
            message: expect.stringContaining('visualization'),
            roots: [WITH_LEGACY_VIS],
          },
          {
            type: 'dashboard',
            id: WITH_LEGACY_VIS,
            reason: 'dropped_content',
            message: expect.stringContaining('legacy_vis'),
            roots: [WITH_LEGACY_VIS],
          },
        ]);
      }
    );

    apiTest(
      'reports a referenced data view that no longer exists and exports the rest',
      async ({ apiClient }) => {
        const response = await exportDashboards(apiClient, [WITH_MISSING, LOGS_FIRST]);

        expect(response).toHaveStatusCode(200);
        expect((response.body.objects as ExportedObject[]).map(toTypeAndId)).toStrictEqual([
          { type: 'dashboard', id: WITH_MISSING },
          { type: 'index-pattern', id: LOGS_DATA_VIEW },
          { type: 'dashboard', id: LOGS_FIRST },
        ]);
        expect(response.body.problems).toStrictEqual([
          {
            type: 'index-pattern',
            id: MISSING_DATA_VIEW,
            reason: 'not_found',
            message: expect.stringContaining(MISSING_DATA_VIEW),
            roots: [WITH_MISSING],
          },
        ]);
      }
    );

    apiTest(
      'fails the whole export with 403 naming the type when the caller cannot read a referenced type',
      async ({ apiClient, requestAuth }) => {
        const credentials = await requestAuth.getApiKeyForCustomRole(DASHBOARD_READ_ROLE);

        const forbidden = await exportDashboards(apiClient, [WITH_GRAPH], credentials);
        expect(forbidden).toHaveStatusCode(403);
        expect(forbidden.body.message).toContain('graph-workspace');

        // The same role can export a dashboard whose references it can read.
        const allowed = await exportDashboards(apiClient, [LOGS_FIRST], credentials);
        expect(allowed).toHaveStatusCode(200);
        expect((allowed.body.objects as ExportedObject[]).map(toTypeAndId)).toStrictEqual([
          { type: 'index-pattern', id: LOGS_DATA_VIEW },
          { type: 'dashboard', id: LOGS_FIRST },
        ]);
      }
    );
  }
);
