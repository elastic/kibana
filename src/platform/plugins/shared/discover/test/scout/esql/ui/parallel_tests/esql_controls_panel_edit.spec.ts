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
 * The FTR suite built the by-value dashboard through the UI on every test; here it
 * comes from {@link testData.ESQL_CONTROLS_BY_VALUE_DASHBOARD_KBN_ARCHIVE}.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

const INITIAL_SELECTION = 'AE';
const UPDATED_SELECTION = 'CN';

/**
 * All rendered controls, wherever they live.
 *
 * On a dashboard an ES|QL control is stored as a top-level `esql_control` panel
 * rather than a control-group control, so it renders `[data-control-id]` *without*
 * the `control-frame` wrapper that `dashboard.getControlIds()` requires. In
 * Discover the same control does sit inside a control group. Matching on
 * `[data-control-id]` alone therefore works in both places, which is what the FTR
 * suite's `getAllControlIds()` did.
 */
const getControls = (page: ScoutPage) => page.locator('[data-control-id]');

/** Asserts exactly one control is rendered and returns its id. */
const getOnlyControlId = async (page: ScoutPage): Promise<string> => {
  const controls = getControls(page);
  await expect(controls).toHaveCount(1);
  const controlId = await controls.getAttribute('data-control-id');
  if (!controlId) {
    throw new Error('Control is rendered but has an empty data-control-id');
  }
  return controlId;
};

spaceTest.describe(
  'Discover ES|QL controls - by-value panel editing',
  { tag: '@local-stateful-classic' },
  () => {
    // `savedObjects.load()` imports with `createNewCopies`, so the dashboard gets a
    // fresh ID on every import and has to be captured from the import response.
    let dashboardId: string;

    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
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

      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest('should retain the controls and their state', async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openDashboardWithId(dashboardId);

      // "View Discover session" navigates to Discover in the same tab.
      await pageObjects.dashboard.clickPanelAction(
        'embeddablePanelAction-ACTION_VIEW_SAVED_SEARCH',
        testData.SESSION_WITH_CONTROL_TITLE
      );
      await pageObjects.discover.waitUntilTabIsLoaded();

      await expect(
        pageObjects.dashboard.getOptionsListSelectionsLocator(await getOnlyControlId(page))
      ).toHaveText(INITIAL_SELECTION);
    });

    spaceTest(
      'should persist updated control selections after saving',
      async ({ page, pageObjects }) => {
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

        const discoverControlId = await getOnlyControlId(page);
        await expect(
          pageObjects.dashboard.getOptionsListSelectionsLocator(discoverControlId)
        ).toHaveText(INITIAL_SELECTION);

        await pageObjects.dashboard.optionsListOpenPopover(discoverControlId);
        await pageObjects.dashboard.optionsListPopoverSelectOption(UPDATED_SELECTION);
        await pageObjects.dashboard.optionsListEnsurePopoverIsClosed();
        await pageObjects.discover.waitUntilTabIsLoaded();

        await expect(
          pageObjects.dashboard.getOptionsListSelectionsLocator(discoverControlId)
        ).toHaveText(UPDATED_SELECTION);

        await pageObjects.discover.saveAndReturnToEditor();
        await pageObjects.dashboard.waitForRenderComplete();

        await expect(
          pageObjects.dashboard.getPanelHoverActionsLocator(testData.SESSION_WITH_CONTROL_TITLE)
        ).toBeVisible();
        await expect(
          pageObjects.dashboard.getOptionsListSelectionsLocator(await getOnlyControlId(page))
        ).toHaveText(UPDATED_SELECTION);
      }
    );

    spaceTest(
      'should discard control selection changes after cancelling',
      async ({ page, pageObjects }) => {
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

        const discoverControlId = await getOnlyControlId(page);
        await pageObjects.dashboard.optionsListOpenPopover(discoverControlId);
        await pageObjects.dashboard.optionsListPopoverSelectOption(UPDATED_SELECTION);
        await pageObjects.dashboard.optionsListEnsurePopoverIsClosed();
        await pageObjects.discover.waitUntilTabIsLoaded();

        await expect(
          pageObjects.dashboard.getOptionsListSelectionsLocator(discoverControlId)
        ).toHaveText(UPDATED_SELECTION);

        await pageObjects.discover.cancelEditorChanges();
        await pageObjects.dashboard.waitForRenderComplete();

        await expect(
          pageObjects.dashboard.getPanelHoverActionsLocator(testData.SESSION_WITH_CONTROL_TITLE)
        ).toBeVisible();
        await expect(
          pageObjects.dashboard.getOptionsListSelectionsLocator(await getOnlyControlId(page))
        ).toHaveText(INITIAL_SELECTION);
      }
    );
  }
);
