/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { VIEW_MODE } from '@kbn/discover-session-constants';
import type { StoredDiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionInternalData } from '../../../../../server/api/internal_schema';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'Internal Discover session on Dashboard',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'loads an internally saved session through Content Management in a linked dashboard panel',
      async ({ apiServices, config, page, pageObjects, scoutSpace }) => {
        const { dashboard, dataGrid, filterBar } = pageObjects;
        const spaceUrl = `${config.hosts.kibana}/s/${scoutSpace.id}`;
        const sessionUrl = `${spaceUrl}/internal/discover_sessions`;
        const headers = {
          'kbn-xsrf': 'scout',
          'x-elastic-internal-origin': 'kibana',
          'elastic-api-version': '1',
        };
        const inlineId = `inline-http-${scoutSpace.id}`;
        const filterRef = 'tab_inline.kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index';
        const sessionData: DiscoverSessionInternalData = {
          title: `Internal session ${scoutSpace.id}`,
          description: '',
          tags: [],
          tabs: [
            {
              id: 'inline',
              label: 'Inline view',
              type: 'default',
              data_source: {
                type: 'data_view_spec',
                id: inlineId,
                index_pattern: 'logstash*',
                time_field: '@timestamp',
              },
              column_order: ['extension'],
              sort: [{ name: '@timestamp', direction: 'desc' }],
              query: { language: 'kql', expression: '' },
              filters: [
                {
                  type: 'condition',
                  condition: { field: 'extension.raw', operator: 'is', value: 'css' },
                  data_view_id: inlineId,
                },
              ],
              hide_chart: false,
              hide_table: false,
              view_mode: VIEW_MODE.DOCUMENT_LEVEL,
            },
          ],
        };
        const updatedTitle = `Updated internal session ${scoutSpace.id}`;
        const updatedColumns = ['extension', 'bytes'];
        const updatedSession: DiscoverSessionInternalData = {
          ...sessionData,
          title: updatedTitle,
          tabs: sessionData.tabs.map((tab) => ({ ...tab, column_order: updatedColumns })),
        };

        const sessionId = await spaceTest.step('create, read and update through HTTP', async () => {
          const created = await page.request.post(sessionUrl, { headers, data: sessionData });
          expect(created.status()).toBe(201);
          const { id }: { id: string } = await created.json();

          const loaded = await page.request.get(`${sessionUrl}/${id}`, { headers });
          expect(loaded.status()).toBe(200);
          const { data }: { data: DiscoverSessionInternalData } = await loaded.json();
          expect(data).toStrictEqual(sessionData);

          const updated = await page.request.put(`${sessionUrl}/${id}`, {
            headers,
            data: updatedSession,
          });
          expect(updated.status()).toBe(200);
          expect(await updated.json()).toMatchObject({ id, data: updatedSession });

          return id;
        });

        await spaceTest.step(
          'read updated fields and unchanged references through CM',
          async () => {
            const response = await page.request.post(`${spaceUrl}/api/content_management/rpc/get`, {
              headers,
              data: { contentTypeId: 'search', id: sessionId, version: 1 },
            });
            expect(response.status()).toBe(200);
            const body: { result: { result: { item: StoredDiscoverSession } } } =
              await response.json();
            const { attributes, references } = body.result.result.item;
            expect(attributes).toStrictEqual({
              title: updatedTitle,
              description: '',
              tabs: [
                {
                  id: 'inline',
                  label: 'Inline view',
                  attributes: {
                    columns: updatedColumns,
                    sort: [['@timestamp', 'desc']],
                    grid: {},
                    hideChart: false,
                    hideTable: false,
                    isTextBasedQuery: false,
                    usesAdHocDataView: true,
                    viewMode: 'documents',
                    timeRestore: false,
                    kibanaSavedObjectMeta: { searchSourceJSON: expect.any(String) },
                  },
                },
              ],
            });
            expect(
              JSON.parse(attributes.tabs[0].attributes.kibanaSavedObjectMeta.searchSourceJSON)
            ).toStrictEqual({
              index: { id: inlineId, title: 'logstash*', timeFieldName: '@timestamp' },
              query: { language: 'kuery', query: '' },
              filter: [
                {
                  meta: {
                    indexRefName: filterRef,
                    key: 'extension.raw',
                    field: 'extension.raw',
                    type: 'phrase',
                    params: { query: 'css' },
                  },
                  query: { match_phrase: { 'extension.raw': 'css' } },
                },
              ],
            });
            expect(references).toStrictEqual([
              { name: filterRef, type: 'index-pattern', id: inlineId },
            ]);
          }
        );

        await spaceTest.step('load and reload a linked panel with the saved filter', async () => {
          const dashboardId = await apiServices.dashboard.create(
            {
              title: `Internal session dashboard ${scoutSpace.id}`,
              panels: [
                {
                  type: 'discover_session',
                  grid: { x: 0, y: 0, w: 24, h: 15 },
                  config: { ref_id: sessionId, selected_tab_id: 'inline' },
                },
              ],
            },
            scoutSpace.id
          );
          await dashboard.openDashboardWithIdInEditMode(dashboardId);
          await dashboard.waitForPanelsToLoad(1);
          await dashboard.expectLinkedToLibrary(updatedTitle);
          await expect
            .poll(() => dataGrid.getColumnTitles())
            .toStrictEqual(['@timestamp', ...updatedColumns]);
          await expect(dataGrid.getCellValue(0, 'extension')).toHaveText('css');

          await page.reload();
          await dashboard.waitForPanelsToLoad(1);
          await dashboard.expectLinkedToLibrary(updatedTitle);
          await expect
            .poll(() => dataGrid.getColumnTitles())
            .toStrictEqual(['@timestamp', ...updatedColumns]);
          await expect(dataGrid.getCellValue(0, 'extension')).toHaveText('css');
          await expect(dashboard.unsavedChangesIndicator).toBeHidden();

          await filterBar.addFilter({ field: 'extension.raw', operator: 'is', value: 'js' });
          await expect(page.testSubj.locator('embeddedSavedSearchDocTable')).toHaveText(
            'No results found'
          );
          await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        });
      }
    );
  }
);
