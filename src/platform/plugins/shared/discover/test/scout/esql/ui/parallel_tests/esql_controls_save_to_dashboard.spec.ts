/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Verifies that saving a Discover table that has ES|QL controls onto a dashboard
 * carries the control and its current selection across, and that adding a new
 * Discover panel whose control matches an existing dashboard control updates that
 * control instead of duplicating it.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

const INITIAL_SELECTION = 'AE';
const UPDATED_SELECTION = 'CN';
const BY_VALUE_TABLE_TITLE = 'ESQL control by-value table';

spaceTest.describe(
  'Discover ES|QL controls - saving to a dashboard',
  { tag: '@local-stateful-classic' },
  () => {
    let discoverSessionId: string;

    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      // Imported with `createNewCopies`, so the id is read back from the response rather
      // than taken from the fixture file.
      const imported = await discoverScoutSpace.savedObjects.load(
        testData.SESSION_WITH_CONTROL_KBN_ARCHIVE
      );
      const session = imported.find(({ type }) => type === 'search');
      if (!session) {
        throw new Error(
          `No Discover session found in ${testData.SESSION_WITH_CONTROL_KBN_ARCHIVE}`
        );
      }
      discoverSessionId = session.id;
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      // Editor is the lowest role that can create the dashboards and saved searches these
      // tests need; running as admin would mask a privilege regression.
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'should create a dashboard with the Discover table and the selected control state',
      async ({ page, pageObjects }) => {
        // Opened by id rather than through the "Open" flyout, whose app-menu item goes
        // stale while Discover re-renders. The control behaviour under test is unaffected
        // by how the session is opened.
        await pageObjects.discover.goto({ queryMode: 'esql', savedSearchId: discoverSessionId });
        await pageObjects.discover.waitUntilTabIsLoaded();

        const discoverControlId = await pageObjects.dashboard.getOnlyControlId();
        await expect(
          pageObjects.discover.controls.getSelectionsLocator(discoverControlId)
        ).toHaveText(INITIAL_SELECTION);

        await pageObjects.dashboard.optionsListOpenPopover(discoverControlId);
        await pageObjects.dashboard.optionsListPopoverSelectOption(UPDATED_SELECTION);
        await pageObjects.dashboard.optionsListEnsurePopoverIsClosed();
        await pageObjects.discover.waitUntilTabIsLoaded();

        await expect(
          pageObjects.discover.controls.getSelectionsLocator(discoverControlId)
        ).toHaveText(UPDATED_SELECTION);

        await pageObjects.discover.saveTableToNewDashboard(BY_VALUE_TABLE_TITLE);

        // The panel is asserted before `waitForRenderComplete()`, which waits on
        // `dshDashboardViewport` — an element the dashboard does not render while it is
        // still showing its empty state. Checking the panel first reports a transfer that
        // never arrived as a missing panel rather than a missing viewport.
        await expect(
          pageObjects.dashboard.getPanelHoverActionsLocator(BY_VALUE_TABLE_TITLE)
        ).toBeVisible({ timeout: 30_000 });
        await pageObjects.dashboard.waitForRenderComplete();

        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        await expect(pageObjects.dashboard.getDashboardControlsLocator()).toHaveCount(1);
        const controlId = await pageObjects.dashboard.getDashboardControlId();
        await expect(pageObjects.dashboard.getOptionsListSelectionsLocator(controlId)).toHaveText(
          UPDATED_SELECTION
        );
      }
    );

    // The dashboard is built through the UI and left unsaved on purpose: unlinking creates
    // the control in-session, so it is registered by the time the panel is added. Starting
    // from an already-saved dashboard instead makes this duplicate the control intermittently
    // (https://github.com/elastic/kibana/issues/265636).
    spaceTest(
      'should update the existing dashboard control instead of creating a duplicate',
      async ({ page, pageObjects }) => {
        await pageObjects.dashboard.openNewDashboard();
        await pageObjects.dashboard.addSavedSearch(testData.SESSION_WITH_CONTROL_TITLE);
        await pageObjects.dashboard.waitForRenderComplete();
        await pageObjects.dashboard.unlinkFromLibrary(testData.SESSION_WITH_CONTROL_TITLE);
        await pageObjects.dashboard.waitForRenderComplete();

        await expect(pageObjects.dashboard.getDashboardControlsLocator()).toHaveCount(1);
        const initialDashboardControlId = await pageObjects.dashboard.getDashboardControlId();
        await expect(
          pageObjects.dashboard.getOptionsListSelectionsLocator(initialDashboardControlId)
        ).toHaveText(INITIAL_SELECTION);

        // Add a second Discover panel that declares a control for the same variable. The
        // panel-selection flyout lists many actions, so filter it first: clicking an entry
        // in the unfiltered list is position dependent.
        await pageObjects.dashboard.openAddPanelFlyout();
        await page.testSubj.fill('dashboardPanelSelectionFlyout__searchInput', 'Discover session');
        await page.testSubj.click('create-action-Discover session');
        await pageObjects.discover.waitUntilTabIsLoaded();
        await pageObjects.discover.selectTextBaseLang();
        await pageObjects.discover.waitUntilTabIsLoaded();

        await pageObjects.discover.createEsqlControl('FROM logstash-* | WHERE geo.dest == ', {
          variableName: '?geo_dest',
          label: 'Updated destination',
        });
        await pageObjects.discover.waitUntilTabIsLoaded();

        const discoverControlId = await pageObjects.dashboard.getOnlyControlId();
        await pageObjects.dashboard.optionsListOpenPopover(discoverControlId);
        await pageObjects.dashboard.optionsListPopoverSelectOption(UPDATED_SELECTION);
        await pageObjects.dashboard.optionsListEnsurePopoverIsClosed();
        await pageObjects.discover.waitUntilTabIsLoaded();

        await expect(
          pageObjects.discover.controls.getSelectionsLocator(discoverControlId)
        ).toHaveText(UPDATED_SELECTION);

        await pageObjects.discover.saveAndReturnToEditor();
        await pageObjects.dashboard.waitForRenderComplete();

        // The matching control is reused, not duplicated: still one control, same id.
        await expect(pageObjects.dashboard.getDashboardControlsLocator()).toHaveCount(1);
        const updatedDashboardControlId = await pageObjects.dashboard.getDashboardControlId();
        expect(updatedDashboardControlId).toBe(initialDashboardControlId);
        await expect(
          pageObjects.dashboard.getOptionsListSelectionsLocator(updatedDashboardControlId)
        ).toHaveText(UPDATED_SELECTION);
      }
    );
  }
);
