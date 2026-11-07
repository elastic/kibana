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
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';

const SANITIZE_PATH = 'internal/dashboards/_sanitize';
const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;

const SAVED_DATA_VIEW_ID = 'sanitize-panels-saved-data-view';
const LIBRARY_CHART_ID = 'sanitize-panels-library-chart';
const grid = { x: 0, y: 0, w: 24, h: 15 };
const adHocDataView = { type: 'data_view_spec', index_pattern: 'logs-*', time_field: '@timestamp' };
const lensPanel = (config: object) => ({ type: 'vis', grid, config });

const PANELS = {
  'a Lens metric on a saved data view': lensPanel({
    type: 'metric',
    title: 'Requests',
    data_source: { type: 'data_view_reference', ref_id: SAVED_DATA_VIEW_ID },
    metrics: [{ type: 'primary', operation: 'count' }],
  }),
  'a Lens data table on a saved data view': lensPanel({
    type: 'data_table',
    title: 'Top response codes',
    data_source: { type: 'data_view_reference', ref_id: SAVED_DATA_VIEW_ID },
    metrics: [{ operation: 'count' }],
    rows: [{ operation: 'terms', fields: ['response.keyword'], limit: 5 }],
  }),
  'a Lens XY chart on an ad hoc data view': lensPanel({
    type: 'xy',
    title: 'Log entries over time',
    layers: [
      {
        type: 'line',
        data_source: adHocDataView,
        x: { operation: 'date_histogram', field: '@timestamp' },
        y: [{ operation: 'count' }],
      },
    ],
  }),
  'a Lens pie chart on an ad hoc data view': lensPanel({
    type: 'pie',
    title: 'Requests by response code',
    data_source: adHocDataView,
    metrics: [{ operation: 'count' }],
    group_by: [{ operation: 'terms', fields: ['response.keyword'], limit: 5 }],
    styling: { donut_hole: 'm' },
  }),
  'a Lens metric on ES|QL': lensPanel({
    type: 'metric',
    title: 'Requests (ES|QL)',
    data_source: { type: 'esql', query: 'FROM logs-* | STATS count = COUNT(*)' },
    metrics: [{ type: 'primary', column: 'count' }],
  }),
  'a Lens data table on ES|QL': lensPanel({
    type: 'data_table',
    title: 'Bytes by host',
    data_source: { type: 'esql', query: 'FROM logs-* | STATS bytes = SUM(bytes) BY host.name' },
    metrics: [{ column: 'bytes' }],
    rows: [{ column: 'host.name' }],
  }),
  'a Lens chart linked to the library': lensPanel({ ref_id: LIBRARY_CHART_ID }),
  'a Markdown panel': { type: 'markdown', grid, config: { content: '# Notes' } },
};

// Export JSON and the "From JSON" tab both send panels through the sanitize route, so a panel
// survives copying to another dashboard when sanitizing its exported JSON changes nothing.
apiTest.describe(
  'dashboards - sanitize panels copied as JSON',
  { tag: tags.deploymentAgnostic },
  () => {
    let editorCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    });

    const sanitize = (apiClient: ApiClientFixture, panels: object[]) =>
      apiClient.post(SANITIZE_PATH, {
        headers: { ...INTERNAL_HEADERS, ...editorCredentials.apiKeyHeader },
        body: { title: 'Panels to sanitize', panels },
        responseType: 'json',
      });

    for (const [name, panel] of Object.entries(PANELS)) {
      apiTest(
        `keeps ${name} unchanged when its exported JSON is imported`,
        async ({ apiClient }) => {
          const exported = await sanitize(apiClient, [panel]);
          expect(exported).toHaveStatusCode(200);
          expect(exported.body.data.panels).toHaveLength(1);

          const imported = await sanitize(apiClient, exported.body.data.panels);
          expect(imported).toHaveStatusCode(200);
          expect(imported.body.data.panels).toStrictEqual(exported.body.data.panels);
        }
      );
    }

    apiTest(
      'reports saved data views and library items as related items',
      async ({ apiClient }) => {
        const response = await sanitize(apiClient, [
          PANELS['a Lens metric on a saved data view'],
          PANELS['a Lens chart linked to the library'],
        ]);

        expect(response).toHaveStatusCode(200);
        expect(response.body.related_items).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({ type: 'index-pattern', id: SAVED_DATA_VIEW_ID }),
            expect.objectContaining({ type: 'lens', id: LIBRARY_CHART_ID }),
          ])
        );
      }
    );

    apiTest(
      'does not report related items for ad hoc data views and ES|QL',
      async ({ apiClient }) => {
        const response = await sanitize(apiClient, [
          PANELS['a Lens XY chart on an ad hoc data view'],
          PANELS['a Lens metric on ES|QL'],
        ]);

        expect(response).toHaveStatusCode(200);
        expect(response.body.related_items).toBeUndefined();
      }
    );

    apiTest('drops panel types that the Dashboards API does not support', async ({ apiClient }) => {
      const response = await sanitize(apiClient, [{ type: 'unknown_panel', grid, config: {} }]);

      expect(response).toHaveStatusCode(200);
      expect(response.body.data.panels).toStrictEqual([]);
      expect(response.body.warnings).toStrictEqual([
        expect.objectContaining({ type: 'dropped_panel', panel_type: 'unknown_panel' }),
      ]);
    });
  }
);
