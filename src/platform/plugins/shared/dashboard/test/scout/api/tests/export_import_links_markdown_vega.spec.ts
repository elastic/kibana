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

const SOURCE_SPACE = 'export-refs-links-source';
const EMPTY_SPACE = 'export-refs-links-empty';
const SPACES = [SOURCE_SPACE, EMPTY_SPACE];

// Dashboard A has a links library panel to B and a markdown library panel; B links back to A.
const LINKS = 'export-refs-links-item';
const MARKDOWN = 'export-refs-links-markdown';
const DASHBOARD_A = 'export-refs-links-a';
const DASHBOARD_B = 'export-refs-links-b';
// A Lens panel's dashboard drilldown points to the target dashboard.
const LENS = 'export-refs-links-lens';
const DRILLDOWN_DASHBOARD = 'export-refs-links-drilldown';
const DRILLDOWN_TARGET = 'export-refs-links-drilldown-target';
// Stored directly, since Vega's API is off by default.
const VEGA = 'export-refs-links-vega';
const VEGA_DASHBOARD = 'export-refs-links-vega-dashboard';

const LIBRARY_API_VERSION = '2023-10-31';

const spacePath = (space: string, path: string) => `/s/${space}/${path}`;

type ExportedObject = ExportReferencedObjectsResponse['objects'][number];
type ImportResult = ImportReferencedObjectsResponse['results'][number];

interface Panel {
  type: string;
  config: {
    ref_id?: string;
    links?: Array<{ destination: string }>;
    drilldowns?: Array<{ dashboard_id: string }>;
  };
}

const grid = (x: number) => ({ x, y: 0, w: 24, h: 10 });

apiTest.describe(
  'dashboards - export and import with links, markdown and Vega',
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

    const putLibraryItem = (apiClient: ApiClientFixture, path: string, body: object) =>
      request(apiClient, 'put', SOURCE_SPACE, path, { body, version: LIBRARY_API_VERSION });

    const getLibraryItem = (apiClient: ApiClientFixture, space: string, path: string) =>
      request(apiClient, 'get', space, path, { version: LIBRARY_API_VERSION });

    const putDashboard = (apiClient: ApiClientFixture, id: string, panels: object[]) =>
      request(apiClient, 'put', SOURCE_SPACE, `${DASHBOARD_API_PATH}/${id}`, {
        body: { title: id, panels },
      });

    const getDashboardPanels = async (apiClient: ApiClientFixture, space: string, id: string) => {
      const response = await request(apiClient, 'get', space, `${DASHBOARD_API_PATH}/${id}`);
      expect(response).toHaveStatusCode(200);
      return response.body.data.panels as Panel[];
    };

    const exportDashboards = (apiClient: ApiClientFixture, ids: string[]) =>
      request(apiClient, 'post', SOURCE_SPACE, `${DASHBOARD_API_PATH}/_export`, {
        body: { ids },
      });

    const importObjects = (
      apiClient: ApiClientFixture,
      space: string,
      body: Pick<ImportReferencedObjectsRequest, 'objects'>
    ) => request(apiClient, 'post', space, `${DASHBOARD_API_PATH}/_import`, { body });

    const toTypeAndId = ({ type, id }: SavedObjectTypeIdTuple) => ({ type, id });
    const findDestinationId = (results: ImportResult[], type: string, id: string) =>
      results.find((result) => result.type === type && result.id === id)?.destination_id ?? '';
    const byTypeAndId = (a: SavedObjectTypeIdTuple, b: SavedObjectTypeIdTuple) =>
      `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`);

    apiTest.beforeAll(async ({ apiClient, kbnClient, requestAuth }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      for (const id of SPACES) {
        await kbnClient.spaces.create({ id, name: id });
      }

      // Created through their public APIs, so the stored items are what users have.
      expect(
        await putLibraryItem(apiClient, `api/links/${LINKS}`, {
          title: 'To dashboard B',
          links: [{ type: 'dashboardLink', label: 'B', destination: DASHBOARD_B }],
        })
      ).toHaveStatusCode(201);
      expect(
        await putLibraryItem(apiClient, `api/markdowns/${MARKDOWN}`, {
          title: 'Read me',
          content: '# Hello',
        })
      ).toHaveStatusCode(201);
      expect(
        await putLibraryItem(apiClient, `api/visualizations/${LENS}`, {
          type: 'metric',
          title: 'Total requests',
          data_source: { type: 'data_view_spec', index_pattern: 'logs-*' },
          metrics: [{ type: 'primary', operation: 'count' }],
        })
      ).toHaveStatusCode(201);

      // B links back to A with a by-value links panel, so A and B form a cycle.
      expect(
        await putDashboard(apiClient, DASHBOARD_B, [
          {
            type: 'links',
            grid: grid(0),
            config: { links: [{ type: 'dashboardLink', destination: DASHBOARD_A }] },
          },
        ])
      ).toHaveStatusCode(201);
      expect(
        await putDashboard(apiClient, DASHBOARD_A, [
          { type: 'links', grid: grid(0), config: { ref_id: LINKS } },
          { type: 'markdown', grid: grid(24), config: { ref_id: MARKDOWN } },
        ])
      ).toHaveStatusCode(201);

      expect(await putDashboard(apiClient, DRILLDOWN_TARGET, [])).toHaveStatusCode(201);
      expect(
        await putDashboard(apiClient, DRILLDOWN_DASHBOARD, [
          {
            type: 'vis',
            grid: grid(0),
            config: {
              ref_id: LENS,
              drilldowns: [
                {
                  type: 'dashboard_drilldown',
                  label: 'Open target',
                  trigger: 'on_apply_filter',
                  dashboard_id: DRILLDOWN_TARGET,
                },
              ],
            },
          },
        ])
      ).toHaveStatusCode(201);

      await kbnClient.savedObjects.create({
        type: 'vega',
        id: VEGA,
        space: SOURCE_SPACE,
        overwrite: true,
        attributes: { title: 'Vega chart', spec: { format: 'hjson', value: '{ mark: point }' } },
        references: [],
      });
      await kbnClient.savedObjects.create({
        type: 'dashboard',
        id: VEGA_DASHBOARD,
        space: SOURCE_SPACE,
        overwrite: true,
        attributes: {
          title: 'With Vega',
          panelsJSON: JSON.stringify([
            {
              type: 'vega',
              panelIndex: 'p1',
              panelRefName: 'panel_p1',
              gridData: { x: 0, y: 0, w: 24, h: 15, i: 'p1' },
              embeddableConfig: {},
            },
          ]),
          optionsJSON: '{}',
          timeRestore: false,
          version: 1,
          kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
        },
        references: [{ type: 'vega', id: VEGA, name: 'p1:panel_p1' }],
      });
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      for (const id of SPACES) {
        await kbnClient.spaces.delete(id);
      }
    });

    apiTest(
      'exports dashboards that link to each other once each, with the links and markdown items as their GET bodies',
      async ({ apiClient }) => {
        const response = await exportDashboards(apiClient, [DASHBOARD_A]);

        expect(response).toHaveStatusCode(200);
        expect(response.body.problems).toStrictEqual([]);
        const exported = response.body.objects as ExportedObject[];
        expect(exported.map(toTypeAndId).sort(byTypeAndId)).toStrictEqual([
          { type: 'dashboard', id: DASHBOARD_A },
          { type: 'dashboard', id: DASHBOARD_B },
          { type: 'links', id: LINKS },
          { type: 'markdown', id: MARKDOWN },
        ]);

        const data = (type: string, id: string) =>
          exported.find((object) => object.type === type && object.id === id)?.data;
        const { body: links } = await getLibraryItem(apiClient, SOURCE_SPACE, `api/links/${LINKS}`);
        const { body: markdown } = await getLibraryItem(
          apiClient,
          SOURCE_SPACE,
          `api/markdowns/${MARKDOWN}`
        );
        expect(data('links', LINKS)).toStrictEqual(links.data);
        expect(data('markdown', MARKDOWN)).toStrictEqual(markdown.data);
      }
    );

    apiTest(
      'moves dashboards with links (including a cycle) and markdown into an empty space, where the links resolve',
      async ({ apiClient }) => {
        const { body: exported } = await exportDashboards(apiClient, [DASHBOARD_A]);

        // The IDs exist in the source space, so core gives them new IDs, like Copy to space.
        const response = await importObjects(apiClient, EMPTY_SPACE, {
          objects: exported.objects as ExportedObject[],
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.success).toBe(true);
        expect(response.body.warnings).toStrictEqual([]);
        const results = response.body.results as ImportResult[];
        const destinationId = (type: string, id: string) => findDestinationId(results, type, id);
        expect(results).toHaveLength(4);
        expect(results.every(({ status }) => status === 'created')).toBe(true);
        const dashboardA = destinationId('dashboard', DASHBOARD_A);
        const dashboardB = destinationId('dashboard', DASHBOARD_B);
        const linksId = destinationId('links', LINKS);
        const markdownId = destinationId('markdown', MARKDOWN);

        const panelsA = await getDashboardPanels(apiClient, EMPTY_SPACE, dashboardA);
        expect(panelsA.map(({ type, config }) => ({ type, ref_id: config.ref_id }))).toStrictEqual([
          { type: 'links', ref_id: linksId },
          { type: 'markdown', ref_id: markdownId },
        ]);

        const links = await getLibraryItem(apiClient, EMPTY_SPACE, `api/links/${linksId}`);
        expect(links).toHaveStatusCode(200);
        expect(links.body.data.links).toStrictEqual([
          expect.objectContaining({ type: 'dashboardLink', destination: dashboardB }),
        ]);

        const panelsB = await getDashboardPanels(apiClient, EMPTY_SPACE, dashboardB);
        expect(panelsB[0].config.links).toStrictEqual([
          expect.objectContaining({ destination: dashboardA }),
        ]);

        const markdown = await getLibraryItem(
          apiClient,
          EMPTY_SPACE,
          `api/markdowns/${markdownId}`
        );
        expect(markdown).toHaveStatusCode(200);
        expect(markdown.body.data.content).toBe('# Hello');
      }
    );

    apiTest(
      "exports a drilldown's target dashboard and points the drilldown to it after import",
      async ({ apiClient }) => {
        const { body: exported } = await exportDashboards(apiClient, [DRILLDOWN_DASHBOARD]);

        expect(exported.problems).toStrictEqual([]);
        const objects = (exported.objects as ExportedObject[]).map(toTypeAndId);
        expect([...objects].sort(byTypeAndId)).toStrictEqual([
          { type: 'dashboard', id: DRILLDOWN_DASHBOARD },
          { type: 'dashboard', id: DRILLDOWN_TARGET },
          { type: 'lens', id: LENS },
        ]);

        const response = await importObjects(apiClient, EMPTY_SPACE, {
          objects: exported.objects as ExportedObject[],
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.success).toBe(true);
        const results = response.body.results as ImportResult[];
        const destinationId = (type: string, id: string) => findDestinationId(results, type, id);

        const [panel] = await getDashboardPanels(
          apiClient,
          EMPTY_SPACE,
          destinationId('dashboard', DRILLDOWN_DASHBOARD)
        );
        expect(panel.config.ref_id).toBe(destinationId('lens', LENS));
        expect(panel.config.drilldowns).toStrictEqual([
          expect.objectContaining({ dashboard_id: destinationId('dashboard', DRILLDOWN_TARGET) }),
        ]);
      }
    );

    apiTest(
      "reports a Vega library item while Vega's feature flag is off, and exports the dashboard",
      async ({ apiClient }) => {
        const response = await exportDashboards(apiClient, [VEGA_DASHBOARD]);

        expect(response).toHaveStatusCode(200);
        expect((response.body.objects as ExportedObject[]).map(toTypeAndId)).toStrictEqual([
          { type: 'dashboard', id: VEGA_DASHBOARD },
        ]);
        expect(response.body.problems).toStrictEqual(
          expect.arrayContaining([
            {
              type: 'vega',
              id: VEGA,
              reason: 'unsupported_type',
              message: expect.stringContaining('vega'),
              roots: [VEGA_DASHBOARD],
            },
          ])
        );
      }
    );
  }
);
