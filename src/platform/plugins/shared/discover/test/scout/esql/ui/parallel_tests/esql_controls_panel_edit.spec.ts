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
 * The first test drives the unlink through the UI, because that conversion is the behavior
 * under test. The editing tests start from
 * {@link testData.ESQL_CONTROLS_BY_VALUE_DASHBOARD_KBN_ARCHIVE} instead, since for them the
 * by-value dashboard is only a precondition.
 */

import { expect } from '@kbn/scout/ui';
import type { DiscoverTestFixtures, DiscoverWorkerFixtures } from '../fixtures';
import { spaceTest, testData } from '../fixtures';

const INITIAL_SELECTION = 'AE';
const UPDATED_SELECTION = 'CN';
// Must differ from the dashboard title inside ESQL_CONTROLS_BY_VALUE_DASHBOARD_KBN_ARCHIVE
// ("ESQL control unlink test dashboard"), which the editing tests below import into the
// same space. Saving under a title that already exists there raises Kibana's
// duplicate-title confirmation, which holds the save modal open.
const UNLINKED_DASHBOARD_TITLE = 'ESQL control unlink test dashboard (built via UI)';

type PageObjects = DiscoverTestFixtures['pageObjects'];
type ScoutSpace = DiscoverWorkerFixtures['discoverScoutSpace'];

spaceTest.describe(
  'Discover ES|QL controls - by-value panel editing',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      // Library saved search that the unlink test adds to a dashboard.
      await discoverScoutSpace.savedObjects.load(testData.SESSION_WITH_CONTROL_KBN_ARCHIVE);
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
      'should retain the control when unlinking a library panel from the library',
      async ({ page, pageObjects }) => {
        await spaceTest.step('add the library Discover session to a new dashboard', async () => {
          await pageObjects.dashboard.openNewDashboard();
          await pageObjects.dashboard.addSavedSearch(testData.SESSION_WITH_CONTROL_TITLE);
          await pageObjects.dashboard.waitForRenderComplete();

          await expect(pageObjects.dashboard.getDashboardControlsLocator()).toHaveCount(1);
          const controlId = await pageObjects.dashboard.getDashboardControlId();
          await expect(pageObjects.dashboard.getOptionsListSelectionsLocator(controlId)).toHaveText(
            INITIAL_SELECTION
          );
        });

        await spaceTest.step('unlink it, converting the panel to by-value', async () => {
          // `unlinkFromLibrary` asserts the panel is no longer library-linked.
          await pageObjects.dashboard.unlinkFromLibrary(testData.SESSION_WITH_CONTROL_TITLE);
          await pageObjects.dashboard.waitForRenderComplete();

          // The ES|QL control survives the by-value conversion, selection intact.
          await expect(pageObjects.dashboard.getDashboardControlsLocator()).toHaveCount(1);
          const controlId = await pageObjects.dashboard.getDashboardControlId();
          await expect(pageObjects.dashboard.getOptionsListSelectionsLocator(controlId)).toHaveText(
            INITIAL_SELECTION
          );
        });

        await spaceTest.step('save the dashboard and re-open the panel in Discover', async () => {
          await pageObjects.dashboard.saveDashboard(UNLINKED_DASHBOARD_TITLE);

          // Saving leaves the dashboard in edit mode, and "View Discover session" below is
          // a view-mode action. `ensureViewMode()` cannot do this: it waits for
          // `dashboardEditMode` to become hidden, but that button is rendered only *in*
          // view mode, so leaving edit mode is what makes it appear.
          await page.testSubj.click('dashboardViewOnlyMode');
          await expect(page.testSubj.locator('dashboardEditMode')).toBeVisible();

          // "View Discover session" navigates to Discover in the same tab.
          await pageObjects.dashboard.clickPanelAction(
            'embeddablePanelAction-ACTION_VIEW_SAVED_SEARCH',
            testData.SESSION_WITH_CONTROL_TITLE
          );
          await pageObjects.discover.waitUntilTabIsLoaded();

          await expect(
            pageObjects.discover.controls.getSelectionsLocator(
              await pageObjects.dashboard.getOnlyControlId()
            )
          ).toHaveText(INITIAL_SELECTION);
        });
      }
    );

    /** Opens the by-value panel in the embedded Discover editor, asserting the starting selection. */
    const openPanelEditor = async (discoverScoutSpace: ScoutSpace, pageObjects: PageObjects) => {
      await spaceTest.step('open the by-value panel in the Discover editor', async () => {
        // A fresh copy per test: these tests save panel edits back to the dashboard. The
        // archive is imported with `createNewCopies`, so the id is read back from the
        // response rather than taken from the fixture file.
        const imported = await discoverScoutSpace.savedObjects.load(
          testData.ESQL_CONTROLS_BY_VALUE_DASHBOARD_KBN_ARCHIVE
        );
        const [dashboard] = imported.filter(({ type }) => type === 'dashboard');
        await pageObjects.dashboard.openDashboardWithId(dashboard.id);
        await pageObjects.dashboard.ensureEditMode();

        await expect(pageObjects.dashboard.getDashboardControlsLocator()).toHaveCount(1);
        const controlId = await pageObjects.dashboard.getDashboardControlId();
        await expect(pageObjects.dashboard.getOptionsListSelectionsLocator(controlId)).toHaveText(
          INITIAL_SELECTION
        );

        await pageObjects.dashboard.clickPanelAction(
          'embeddablePanelAction-editPanel',
          testData.SESSION_WITH_CONTROL_TITLE
        );
        await pageObjects.discover.waitUntilTabIsLoaded();

        await expect(
          pageObjects.discover.controls.getSelectionsLocator(
            await pageObjects.dashboard.getOnlyControlId()
          )
        ).toHaveText(INITIAL_SELECTION);
      });
    };

    /** Switches the control in the Discover editor to {@link UPDATED_SELECTION}. */
    const selectControlOption = async (pageObjects: PageObjects) => {
      const controlId = await pageObjects.dashboard.getOnlyControlId();
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
      async ({ discoverScoutSpace, pageObjects }) => {
        await openPanelEditor(discoverScoutSpace, pageObjects);

        await spaceTest.step(`change the control selection to ${UPDATED_SELECTION}`, async () => {
          await selectControlOption(pageObjects);
        });

        await spaceTest.step('save and return, keeping the new selection', async () => {
          await pageObjects.discover.saveAndReturnToEditor();
          await pageObjects.dashboard.waitForRenderComplete();

          await expect(
            pageObjects.dashboard.getPanelHoverActionsLocator(testData.SESSION_WITH_CONTROL_TITLE)
          ).toBeVisible();
          await expect(pageObjects.dashboard.getDashboardControlsLocator()).toHaveCount(1);
          const controlId = await pageObjects.dashboard.getDashboardControlId();
          await expect(pageObjects.dashboard.getOptionsListSelectionsLocator(controlId)).toHaveText(
            UPDATED_SELECTION
          );
        });
      }
    );

    spaceTest(
      'should discard control selection changes after cancelling',
      async ({ discoverScoutSpace, pageObjects }) => {
        await openPanelEditor(discoverScoutSpace, pageObjects);

        await spaceTest.step(`change the control selection to ${UPDATED_SELECTION}`, async () => {
          await selectControlOption(pageObjects);
        });

        await spaceTest.step('cancel, reverting to the original selection', async () => {
          await pageObjects.discover.cancelEditorChanges();
          await pageObjects.dashboard.waitForRenderComplete();

          await expect(
            pageObjects.dashboard.getPanelHoverActionsLocator(testData.SESSION_WITH_CONTROL_TITLE)
          ).toBeVisible();
          await expect(pageObjects.dashboard.getDashboardControlsLocator()).toHaveCount(1);
          const controlId = await pageObjects.dashboard.getDashboardControlId();
          await expect(pageObjects.dashboard.getOptionsListSelectionsLocator(controlId)).toHaveText(
            INITIAL_SELECTION
          );
        });
      }
    );
  }
);
