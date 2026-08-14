/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Verifies that an unlinked (by-value) Discover session panel on a dashboard keeps
 * its ES|QL control when viewed in Discover, and that editing the control in the
 * embedded Discover editor is persisted on save and discarded on cancel.
 *
 * Migrated from `src/platform/test/functional/apps/discover/esql_4/_esql_controls.ts`
 * (`when viewing / editing an unlinked by-value ES|QL panel in Discover` groups).
 *
 * The first test keeps the FTR suite's UI-driven setup, because unlinking a library
 * panel is itself the behavior under test. The editing tests start from
 * {@link testData.ESQL_CONTROLS_BY_VALUE_DASHBOARD_KBN_ARCHIVE} instead, since for
 * them the by-value dashboard is only a precondition.
 */

import { expect } from '@kbn/scout/ui';
import type { DiscoverTestFixtures } from '../fixtures';
import { getOnlyControlId, spaceTest, testData } from '../fixtures';

const INITIAL_SELECTION = 'AE';
const UPDATED_SELECTION = 'CN';
// Must differ from the title inside ESQL_CONTROLS_BY_VALUE_DASHBOARD_KBN_ARCHIVE
// ("ESQL control unlink test dashboard"), which `beforeEach` imports into the same
// space. Saving a second dashboard under that title triggers Kibana's duplicate-title
// confirmation, which leaves the save modal open.
const UNLINKED_DASHBOARD_TITLE = 'ESQL control unlink test dashboard (built via UI)';

type PanelEditContext = Pick<DiscoverTestFixtures, 'page' | 'pageObjects'>;

spaceTest.describe(
  'Discover ES|QL controls - by-value panel editing',
  { tag: '@local-stateful-classic' },
  () => {
    // `savedObjects.load()` imports with `createNewCopies`, so the dashboard gets a
    // fresh ID on every import and has to be captured from the import response.
    let dashboardId: string;

    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      // Library saved search that the unlink test adds to a dashboard.
      await discoverScoutSpace.savedObjects.load(testData.SESSION_WITH_CONTROL_KBN_ARCHIVE);
    });

    // Each test mutates the dashboard (saving panel edits), so reload a clean copy.
    spaceTest.beforeEach(async ({ browserAuth, discoverScoutSpace }) => {
      const imported = await discoverScoutSpace.savedObjects.load(
        testData.ESQL_CONTROLS_BY_VALUE_DASHBOARD_KBN_ARCHIVE
      );
      const dashboard = imported.find(({ type }) => type === 'dashboard');
      if (!dashboard) {
        throw new Error(
          `Expected a dashboard in ${
            testData.ESQL_CONTROLS_BY_VALUE_DASHBOARD_KBN_ARCHIVE
          }, got: ${imported.map(({ type }) => type).join(', ')}`
        );
      }
      dashboardId = dashboard.id;

      // FTR ran as `kibana_admin` + `test_logstash_reader`. `kibana_admin` grants full
      // Kibana administrative privileges, so `admin` is the faithful mapping here;
      // `loginAsPrivilegedUser()` (`editor`) would be a downgrade, not an equivalent.
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'should retain the control when unlinking a library panel from the library',
      async ({ page, pageObjects }) => {
        await spaceTest.step('add the library Discover session to a new dashboard', async () => {
          await pageObjects.dashboard.openNewDashboard();
          await pageObjects.dashboard.addSavedSearch(testData.SESSION_WITH_CONTROL_TITLE);
          await pageObjects.dashboard.waitForRenderComplete();

          await expect(
            pageObjects.dashboard.getOptionsListSelectionsLocator(await getOnlyControlId(page))
          ).toHaveText(INITIAL_SELECTION);
        });

        await spaceTest.step('unlink it, converting the panel to by-value', async () => {
          // `unlinkFromLibrary` asserts the panel is no longer library-linked.
          await pageObjects.dashboard.unlinkFromLibrary(testData.SESSION_WITH_CONTROL_TITLE);
          await pageObjects.dashboard.waitForRenderComplete();

          // The ES|QL control survives the by-value conversion, selection intact.
          await expect(
            pageObjects.dashboard.getOptionsListSelectionsLocator(await getOnlyControlId(page))
          ).toHaveText(INITIAL_SELECTION);
        });

        await spaceTest.step('save the dashboard and re-open the panel in Discover', async () => {
          await pageObjects.dashboard.saveDashboard(UNLINKED_DASHBOARD_TITLE);

          // Saving leaves the dashboard in edit mode, so exit explicitly (the FTR suite
          // called `switchToViewMode()` here for the same reason). `ensureViewMode()` is
          // unusable: its `clickCancelOutOfEditMode()` waits for `dashboardEditMode` to
          // become hidden, but that button is only rendered *in* view mode, so leaving
          // edit mode is exactly what makes it appear.
          await page.testSubj.click('dashboardViewOnlyMode');
          await expect(page.testSubj.locator('dashboardEditMode')).toBeVisible();

          // "View Discover session" navigates to Discover in the same tab.
          await pageObjects.dashboard.clickPanelAction(
            'embeddablePanelAction-ACTION_VIEW_SAVED_SEARCH',
            testData.SESSION_WITH_CONTROL_TITLE
          );
          await pageObjects.discover.waitUntilTabIsLoaded();

          await expect(
            pageObjects.discover.controls.getSelectionsLocator(await getOnlyControlId(page))
          ).toHaveText(INITIAL_SELECTION);
        });
      }
    );

    /** Opens the by-value panel in the embedded Discover editor, asserting the starting selection. */
    const openPanelEditor = async ({ page, pageObjects }: PanelEditContext) => {
      await spaceTest.step('open the by-value panel in the Discover editor', async () => {
        await pageObjects.dashboard.openDashboardWithId(dashboardId);
        await pageObjects.dashboard.ensureEditMode();

        await expect(
          pageObjects.dashboard.getOptionsListSelectionsLocator(await getOnlyControlId(page))
        ).toHaveText(INITIAL_SELECTION);

        await pageObjects.dashboard.clickPanelAction(
          'embeddablePanelAction-editPanel',
          testData.SESSION_WITH_CONTROL_TITLE
        );
        await pageObjects.discover.waitUntilTabIsLoaded();

        await expect(
          pageObjects.discover.controls.getSelectionsLocator(await getOnlyControlId(page))
        ).toHaveText(INITIAL_SELECTION);
      });
    };

    /** Switches the control in the Discover editor to {@link UPDATED_SELECTION}. */
    const selectControlOption = async ({ page, pageObjects }: PanelEditContext) => {
      const controlId = await getOnlyControlId(page);
      // The options-list control is a shared component; its Scout interaction helpers
      // live on `DashboardApp` regardless of which app renders it.
      await pageObjects.dashboard.optionsListOpenPopover(controlId);
      await pageObjects.dashboard.optionsListPopoverSelectOption(UPDATED_SELECTION);
      await pageObjects.dashboard.optionsListEnsurePopoverIsClosed();
      await pageObjects.discover.waitUntilTabIsLoaded();

      await expect(pageObjects.discover.controls.getSelectionsLocator(controlId)).toHaveText(
        UPDATED_SELECTION
      );
    };

    spaceTest(
      'should persist updated control selections after saving',
      async ({ page, pageObjects }) => {
        await openPanelEditor({ page, pageObjects });

        await spaceTest.step(`change the control selection to ${UPDATED_SELECTION}`, async () => {
          await selectControlOption({ page, pageObjects });
        });

        await spaceTest.step('save and return, keeping the new selection', async () => {
          await pageObjects.discover.saveAndReturnToEditor();
          await pageObjects.dashboard.waitForRenderComplete();

          await expect(
            pageObjects.dashboard.getPanelHoverActionsLocator(testData.SESSION_WITH_CONTROL_TITLE)
          ).toBeVisible();
          await expect(
            pageObjects.dashboard.getOptionsListSelectionsLocator(await getOnlyControlId(page))
          ).toHaveText(UPDATED_SELECTION);
        });
      }
    );

    spaceTest(
      'should discard control selection changes after cancelling',
      async ({ page, pageObjects }) => {
        await openPanelEditor({ page, pageObjects });

        await spaceTest.step(`change the control selection to ${UPDATED_SELECTION}`, async () => {
          await selectControlOption({ page, pageObjects });
        });

        await spaceTest.step('cancel, reverting to the original selection', async () => {
          await pageObjects.discover.cancelEditorChanges();
          await pageObjects.dashboard.waitForRenderComplete();

          await expect(
            pageObjects.dashboard.getPanelHoverActionsLocator(testData.SESSION_WITH_CONTROL_TITLE)
          ).toBeVisible();
          await expect(
            pageObjects.dashboard.getOptionsListSelectionsLocator(await getOnlyControlId(page))
          ).toHaveText(INITIAL_SELECTION);
        });
      }
    );
  }
);
