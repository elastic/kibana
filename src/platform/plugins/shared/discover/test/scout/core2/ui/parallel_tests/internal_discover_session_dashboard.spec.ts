/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import type { StoredDiscoverSession } from '@kbn/saved-search-plugin/common';
import { spaceTest, tags } from '../fixtures';

spaceTest.describe(
  'Internal Discover session on Dashboard',
  { tag: [...tags.deploymentAgnostic, ...tags.serverless.observability.logs_essentials] },
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
        const storedSession: StoredDiscoverSession = {
          attributes: {
            title: `Internal session ${scoutSpace.id}`,
            description: '',
            tabs: [
              {
                id: 'inline',
                label: 'Inline view',
                attributes: {
                  columns: ['extension'],
                  sort: [['@timestamp', 'desc']],
                  grid: {},
                  hideChart: false,
                  hideTable: false,
                  isTextBasedQuery: false,
                  usesAdHocDataView: true,
                  kibanaSavedObjectMeta: {
                    searchSourceJSON: JSON.stringify({
                      index: { id: inlineId, title: 'logstash*', timeFieldName: '@timestamp' },
                      query: { language: 'kuery', query: '' },
                      filter: [
                        {
                          meta: {
                            indexRefName: filterRef,
                            key: 'extension.raw',
                            type: 'phrase',
                            params: { query: 'css' },
                            disabled: false,
                            negate: false,
                            alias: null,
                          },
                          query: { match_phrase: { 'extension.raw': 'css' } },
                        },
                      ],
                    }),
                  },
                },
              },
            ],
          },
          references: [{ name: filterRef, type: 'index-pattern', id: inlineId }],
        };
        const updatedTitle = `Updated internal session ${scoutSpace.id}`;
        const updatedColumns = ['extension', 'bytes'];
        const updatedSession: StoredDiscoverSession = {
          attributes: {
            ...storedSession.attributes,
            title: updatedTitle,
            tabs: storedSession.attributes.tabs.map((tab) => ({
              ...tab,
              attributes: { ...tab.attributes, columns: updatedColumns },
            })),
          },
          references: storedSession.references,
        };

        const sessionId = await spaceTest.step('create, read and update through HTTP', async () => {
          const created = await page.request.post(sessionUrl, { headers, data: storedSession });
          expect(created.status()).toBe(201);
          const { id }: { id: string } = await created.json();

          const loaded = await page.request.get(`${sessionUrl}/${id}`, { headers });
          expect(loaded.status()).toBe(200);
          const { data }: { data: StoredDiscoverSession } = await loaded.json();
          expect(data).toStrictEqual(storedSession);

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
            expect({ attributes, references }).toStrictEqual(updatedSession);
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
