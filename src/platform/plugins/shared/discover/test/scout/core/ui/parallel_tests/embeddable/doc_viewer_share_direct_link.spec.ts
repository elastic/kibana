/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Smoke test for Doc Viewer deep links from the Discover embeddable.
 */
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../../common/ui/fixtures';

const PANEL_FILTER = { field: 'extension.raw', operator: 'is', value: 'jpg' } as const;
const EXPANDED_DOC_URL_STATE = 'expandedDoc:';

const getDecodedUrl = (page: ScoutPage) => decodeURIComponent(page.url());

spaceTest.describe(
  'Discover embeddable - doc viewer share direct link',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.use({ viewport: { width: 1600, height: 1200 } });

    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ page }) => {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'shares a panel document as a Discover deep link that restores the document and its context',
      async ({ page, browserAuth, pageObjects, scoutSpace }) => {
        const { dashboard, dataGrid, discover, docViewer, filterBar } = pageObjects;
        const searchName = `embeddable share search ${scoutSpace.id}`;
        const dashboardName = `embeddable share dashboard ${scoutSpace.id}`;

        // As editor: a saved search whose filter is the panel context we expect the link to carry,
        // placed on a dashboard so the document opens from the embeddable.
        await browserAuth.loginAsPrivilegedUser();
        await discover.goto({ queryMode: 'classic' });
        await discover.waitUntilTabIsLoaded();
        await filterBar.addFilter(PANEL_FILTER);
        await dataGrid.waitForLoad();
        await discover.saveSearch(searchName);

        await dashboard.openNewDashboard();
        await dashboard.addSavedSearch(searchName);
        await dashboard.waitForRenderComplete();
        await dashboard.saveDashboard(dashboardName);
        await dashboard.waitForRenderComplete();
        const dashboardId = page.url().match(/#\/(?:view|edit)\/([^?]+)/)?.[1];
        expect(
          dashboardId,
          `Could not determine the saved dashboard id from ${page.url()}`
        ).toBeTruthy();

        // Reopen as viewer. The viewer's "copy link" is a synchronous redirect URL,
        // whereas the editor path builds a short URL first and the
        // clipboard write after that await does not land in headless Chromium.
        await browserAuth.loginAsViewer();
        await dashboard.openDashboardWithId(dashboardId!, { waitForRender: false });
        await page.reload();
        await dashboard.waitForRenderComplete();
        await dataGrid.waitForDocTableRendered();

        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        const timestamp = await docViewer.getFieldValue('@timestamp').innerText();
        const sharedUrl = await docViewer.copyDirectLink();

        // The link lands in Discover on the same document, with the panel filter applied.
        await page.goto(sharedUrl);
        await discover.waitUntilTabIsLoaded();

        await expect.poll(() => getDecodedUrl(page)).toContain(EXPANDED_DOC_URL_STATE);
        await docViewer.waitForFlyoutOpen();
        await expect(docViewer.getFieldValue('@timestamp')).toHaveText(timestamp);

        expect(
          await filterBar.hasFilter({ field: PANEL_FILTER.field, value: PANEL_FILTER.value })
        ).toBe(true);
      }
    );
  }
);
