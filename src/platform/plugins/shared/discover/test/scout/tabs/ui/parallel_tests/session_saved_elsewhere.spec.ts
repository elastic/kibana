/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import type { DiscoverSessionApiDataInput } from '@kbn/as-code-discover-schema';
import {
  DISCOVER_SESSION_API_BASE_PATH,
  DISCOVER_SESSION_API_VERSION,
} from '../../../../../common/constants';
import { spaceTest, testData } from '../fixtures';

const CHANGED_TAB_ID = 'changed-tab';
const CHANGED_TAB_LABEL = 'Changed tab';
const LOCAL_QUERY = 'extension : jpg';

spaceTest.describe(
  'Discover tabs - session saved elsewhere',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'keeps unsaved changes of a replaced tab as a recently closed tab',
      async ({ apiServices, discoverScoutSpace, kbnClient, page, pageObjects }) => {
        const { discover, queryBar, unifiedTabs } = pageObjects;
        const sessionName = `Saved elsewhere Discover session ${Date.now()}`;
        const dataSource = {
          type: 'data_view_reference',
          ref_id: discoverScoutSpace.getDataViewId(testData.DEFAULT_DATA_VIEW),
        } as const;
        const session = {
          title: sessionName,
          tabs: [
            { id: CHANGED_TAB_ID, label: CHANGED_TAB_LABEL, data_source: dataSource },
            { id: 'unchanged-tab', label: 'Unchanged tab', data_source: dataSource },
          ],
        } satisfies DiscoverSessionApiDataInput;

        const sessionId = await spaceTest.step(
          'open the saved session and change a tab locally',
          async () => {
            const id = await apiServices.discover.create(session, discoverScoutSpace.id);
            await discover.loadSavedSearch(sessionName);
            await unifiedTabs.clearRecentlyClosedTabs();
            await discover.writeAndSubmitKqlQuery(LOCAL_QUERY);
            // The local draft records the unsaved tabs after a throttle
            await expect
              .poll(() => page.evaluate(() => localStorage.getItem('discover.tabs')))
              .toContain(`"unsavedTabIds":["${CHANGED_TAB_ID}"]`);
            return id;
          }
        );

        await spaceTest.step('save the session elsewhere and reload', async () => {
          await kbnClient.request({
            method: 'PUT',
            path: `/s/${discoverScoutSpace.id}${DISCOVER_SESSION_API_BASE_PATH}/${sessionId}`,
            body: session,
            headers: { 'elastic-api-version': DISCOVER_SESSION_API_VERSION },
          });
          await page.reload();
          await discover.waitUntilTabIsLoaded();
        });

        await spaceTest.step(
          'restore the local changes from the recently closed tabs',
          async () => {
            expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([
              CHANGED_TAB_LABEL,
            ]);
            await unifiedTabs.restoreRecentlyClosedTab(0);
            await discover.waitUntilTabIsLoaded();
            expect(await queryBar.getQuery()).toBe(LOCAL_QUERY);
          }
        );
      }
    );
  }
);
