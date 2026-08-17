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
 *
 * Migrated from `src/platform/test/functional/apps/discover/esql_4/_esql_controls.ts`
 * (`when saving a Discover table with ES|QL controls to a dashboard` and
 * `when saving a new by-value Discover session panel back to a dashboard with
 * matching controls` groups).
 */

import { expect } from '@kbn/scout/ui';
import {
  createEsqlControl,
  getOnlyControlId,
  loadSavedObjectIdFromArchive,
  spaceTest,
  testData,
} from '../fixtures';

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
      discoverSessionId = await loadSavedObjectIdFromArchive(
        discoverScoutSpace,
        testData.SESSION_WITH_CONTROL_KBN_ARCHIVE,
        'search'
      );
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

        const discoverControlId = await getOnlyControlId(page);
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
        await expect(
          pageObjects.dashboard.getOptionsListSelectionsLocator(await getOnlyControlId(page))
        ).toHaveText(UPDATED_SELECTION);
      }
    );

    // The dashboard is built through the UI and left unsaved on purpose, so that unlinking
    // creates the control in-session and it is registered before the panel is added.
    // Reusing it depends on `AddDiscoverSessionPanelAction` snapshotting the dashboard's
    // controls via `getAllEsqlControls()`, which reads only the container children present
    // at that moment. A control still mounting is missing from the snapshot, and an empty
    // snapshot is truthy, so it passes the `if (!dashboardControlGroupState)` guard in
    // `reconcileControlGroupState` with no variable to match and the Discover-side panel id
    // survives as a second control. Loading an already-saved dashboard here reintroduces
    // that race (https://github.com/elastic/kibana/issues/265636).
    spaceTest(
      'should update the existing dashboard control instead of creating a duplicate',
      async ({ page, pageObjects }) => {
        await pageObjects.dashboard.openNewDashboard();
        await pageObjects.dashboard.addSavedSearch(testData.SESSION_WITH_CONTROL_TITLE);
        await pageObjects.dashboard.waitForRenderComplete();
        await pageObjects.dashboard.unlinkFromLibrary(testData.SESSION_WITH_CONTROL_TITLE);
        await pageObjects.dashboard.waitForRenderComplete();

        const initialDashboardControlId = await getOnlyControlId(page);
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

        await createEsqlControl(page, 'FROM logstash-* | WHERE geo.dest == ', {
          variableName: '?geo_dest',
          label: 'Updated destination',
        });
        await pageObjects.discover.waitUntilTabIsLoaded();

        const discoverControlId = await getOnlyControlId(page);
        await pageObjects.dashboard.optionsListOpenPopover(discoverControlId);
        await pageObjects.dashboard.optionsListPopoverSelectOption(UPDATED_SELECTION);
        await pageObjects.dashboard.optionsListEnsurePopoverIsClosed();
        await pageObjects.discover.waitUntilTabIsLoaded();

        await expect(
          pageObjects.discover.controls.getSelectionsLocator(discoverControlId)
        ).toHaveText(UPDATED_SELECTION);

        await pageObjects.discover.saveAndReturnToEditor();
        await pageObjects.dashboard.waitForRenderComplete();

        // The matching control is reused, not duplicated.
        const updatedDashboardControlId = await getOnlyControlId(page);
        expect(updatedDashboardControlId).toBe(initialDashboardControlId);
        await expect(
          pageObjects.dashboard.getOptionsListSelectionsLocator(updatedDashboardControlId)
        ).toHaveText(UPDATED_SELECTION);
      }
    );
  }
);
