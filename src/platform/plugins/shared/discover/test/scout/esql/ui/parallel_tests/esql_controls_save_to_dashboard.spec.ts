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
import { createEsqlControl, getOnlyControlId, spaceTest, testData } from '../fixtures';

const INITIAL_SELECTION = 'AE';
const UPDATED_SELECTION = 'CN';
const BY_VALUE_TABLE_TITLE = 'ESQL control by-value table';

spaceTest.describe(
  'Discover ES|QL controls - saving to a dashboard',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      await discoverScoutSpace.savedObjects.load(testData.SESSION_WITH_CONTROL_KBN_ARCHIVE);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'should create a dashboard with the Discover table and the selected control state',
      async ({ page, pageObjects }) => {
        await pageObjects.discover.goto({ queryMode: 'esql' });
        await pageObjects.discover.loadSavedSearch(testData.SESSION_WITH_CONTROL_TITLE);
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

        await pageObjects.discover.saveTableToNewDashboard(BY_VALUE_TABLE_TITLE);
        await pageObjects.dashboard.waitForRenderComplete();

        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        await expect(
          pageObjects.dashboard.getPanelHoverActionsLocator(BY_VALUE_TABLE_TITLE)
        ).toBeVisible();
        await expect(
          pageObjects.dashboard.getOptionsListSelectionsLocator(await getOnlyControlId(page))
        ).toHaveText(UPDATED_SELECTION);
      }
    );

    // This was skipped in FTR because it intermittently produced a duplicate control
    // (https://github.com/elastic/kibana/issues/265636). Enabled here. The duplicate
    // is caught by the control count inside `getOnlyControlId`, asserted only after
    // `waitForRenderComplete()` has settled the control group — if it still flakes,
    // that points at the product bug rather than the test.
    spaceTest(
      'should update the existing dashboard control instead of creating a duplicate',
      async ({ discoverScoutSpace, page, pageObjects }) => {
        // Starts from the same by-value dashboard the panel-edit spec uses: one
        // unlinked Discover session panel plus its matching `geo_dest` control.
        const imported = await discoverScoutSpace.savedObjects.load(
          testData.ESQL_CONTROLS_BY_VALUE_DASHBOARD_KBN_ARCHIVE
        );
        const dashboard = imported.find(({ type }) => type === 'dashboard');
        if (!dashboard) {
          throw new Error(
            `Expected a dashboard in ${testData.ESQL_CONTROLS_BY_VALUE_DASHBOARD_KBN_ARCHIVE}`
          );
        }

        await pageObjects.dashboard.openDashboardWithId(dashboard.id);
        await pageObjects.dashboard.ensureEditMode();

        const initialDashboardControlId = await getOnlyControlId(page);
        await expect(
          pageObjects.dashboard.getOptionsListSelectionsLocator(initialDashboardControlId)
        ).toHaveText(INITIAL_SELECTION);

        // Add a second Discover panel that declares a control for the same variable.
        await pageObjects.dashboard.addNewPanel('Discover session');
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
          pageObjects.dashboard.getOptionsListSelectionsLocator(discoverControlId)
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
