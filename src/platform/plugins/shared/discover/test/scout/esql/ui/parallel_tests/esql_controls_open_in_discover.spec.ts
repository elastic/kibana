/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Verifies that "Open in Discover" on a dashboard ES|QL panel carries the
 * dashboard's ES|QL control (and its selection) over into the Discover tab it
 * opens.
 *
 * Migrated from `src/platform/test/functional/apps/discover/esql_4/_esql_controls.ts`
 * (`when adding an ES|QL panel with controls in Dashboard and exploring it in Discover` group).
 */

import { DiscoverApp, extendPlaywrightPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { loadSavedObjectIdFromArchive, spaceTest, testData } from '../fixtures';

spaceTest.describe(
  'Discover ES|QL controls - open dashboard panel in Discover',
  { tag: '@local-stateful-classic' },
  () => {
    let dashboardId: string;

    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      dashboardId = await loadSavedObjectIdFromArchive(
        discoverScoutSpace,
        testData.ESQL_CONTROLS_DASHBOARD_KBN_ARCHIVE,
        'dashboard'
      );
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      // Editor is enough to open a dashboard panel in Discover; running as admin would
      // mask a privilege regression.
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'should retain the controls and their state',
      async ({ kbnUrl, page, pageObjects }) => {
        await pageObjects.dashboard.openDashboardWithId(dashboardId);

        await expect(pageObjects.dashboard.getControlsGroupLocator()).toBeVisible();

        // "Open in Discover" opens a new browser tab.
        const [openedPage] = await Promise.all([
          page.context().waitForEvent('page'),
          pageObjects.dashboard.clickPanelAction('embeddablePanelAction-ACTION_OPEN_IN_DISCOVER'),
        ]);

        const discoverPage = extendPlaywrightPage({ page: openedPage, kbnUrl });
        const discover = new DiscoverApp(discoverPage);

        await discover.waitUntilTabIsLoaded();

        // The dashboard control is carried over into Discover.
        await expect(
          discover.controls.getControlFrame(testData.ESQL_CONTROLS_CONTROL_ID)
        ).toBeVisible();

        await expect(discoverPage.testSubj.locator('discoverDocTable')).toHaveAttribute(
          'data-render-complete',
          'true'
        );

        await openedPage.close();
      }
    );
  }
);
