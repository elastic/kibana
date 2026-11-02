/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Verifies that an ES|QL control created in the embedded Discover editor for a library
 * (by-reference) Discover session panel is added to the dashboard on save, next to the
 * control the dashboard already had for that session, and that saving a session into another
 * dashboard that already has a control for the same variable doesn't duplicate it.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

// Extends the session's saved query (`FROM logstash-* | WHERE geo.dest == ?geo_dest`) so the
// existing control stays in use and a second one is created at the end.
const SECOND_CONTROL_QUERY_START = 'FROM logstash-* | WHERE geo.dest == ?geo_dest AND geo.src == ';

spaceTest.describe(
  'Discover ES|QL controls - by-reference panel editing',
  { tag: '@local-stateful-classic' },
  () => {
    let discoverSessionId: string;

    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      // Imported with `createNewCopies`, so the id is read back from the response
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
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'should add a control created in the Discover editor to the dashboard',
      async ({ page, pageObjects }) => {
        const { controls, dashboard, discover } = pageObjects;

        const initialControlId = await spaceTest.step(
          'add the library Discover session to a new dashboard',
          async () => {
            await dashboard.openNewDashboard();
            await dashboard.addSavedSearch(testData.SESSION_WITH_CONTROL_TITLE);
            await dashboard.waitForRenderComplete();

            await expect(dashboard.getDashboardControlsLocator()).toHaveCount(1);
            return dashboard.getDashboardControlId();
          }
        );

        await spaceTest.step(
          'create a second control in the embedded Discover editor',
          async () => {
            await dashboard.editLinkedDiscoverPanel(testData.SESSION_WITH_CONTROL_TITLE);
            await discover.waitUntilTabIsLoaded();
            await expect(controls.frames).toHaveCount(1);

            await discover.createEsqlControl(SECOND_CONTROL_QUERY_START, {
              variableName: '?geo_src',
            });
            await discover.waitUntilTabIsLoaded();
            await expect(controls.frames).toHaveCount(2);
          }
        );

        await spaceTest.step('save the session and return to the dashboard', async () => {
          await discover.saveEditorSessionAndReturn();
          await dashboard.waitForRenderComplete();

          await expect(
            dashboard.getPanelHoverActionsLocator(testData.SESSION_WITH_CONTROL_TITLE)
          ).toBeVisible();
          await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);

          // The new control is added while the existing one is kept, id intact.
          await expect(dashboard.getDashboardControlsLocator()).toHaveCount(2);
          await expect(page.locator(`[data-control-id="${initialControlId}"]`)).toBeVisible();
        });
      }
    );

    spaceTest(
      'should not duplicate a control when saving a copy into another dashboard',
      async ({ page, pageObjects }) => {
        const { controls, dashboard, discover } = pageObjects;
        const targetDashboard = 'Target dashboard';

        const targetControlId = await spaceTest.step(
          'create a dashboard that already has a control for the session variable',
          async () => {
            await dashboard.openNewDashboard();
            await dashboard.addSavedSearch(testData.SESSION_WITH_CONTROL_TITLE);
            await dashboard.waitForRenderComplete();
            await expect(dashboard.getDashboardControlsLocator()).toHaveCount(1);
            const controlId = await dashboard.getDashboardControlId();
            await dashboard.saveDashboard(targetDashboard);
            return controlId;
          }
        );

        await spaceTest.step(
          'open the session panel of another dashboard in Discover',
          async () => {
            await dashboard.goto();
            await dashboard.openNewDashboard();
            await dashboard.addSavedSearch(testData.SESSION_WITH_CONTROL_TITLE);
            await dashboard.waitForRenderComplete();
            await dashboard.editLinkedDiscoverPanel(testData.SESSION_WITH_CONTROL_TITLE);
            await discover.waitUntilTabIsLoaded();
            await expect(controls.frames).toHaveCount(1);
          }
        );

        await spaceTest.step('save a copy into the target dashboard', async () => {
          await discover.openSaveSearchAsModal();
          await discover.saveModal.fillTitle('Session copy');
          await discover.saveModal.selectExistingDashboard(targetDashboard);
          await page.testSubj.click('confirmSaveSavedObjectButton');
          await page.waitForURL(/\/app\/dashboards/);
          await dashboard.waitForRenderComplete();
        });

        // The target keeps its own control instead of receiving a second one for the variable
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        await expect(dashboard.getDashboardControlsLocator()).toHaveCount(1);
        await expect(page.locator(`[data-control-id="${targetControlId}"]`)).toBeVisible();
      }
    );

    spaceTest(
      'should not duplicate a control when saving from Discover into a dashboard',
      async ({ page, pageObjects }) => {
        const { dashboard, discover } = pageObjects;
        const targetDashboard = 'Standalone target dashboard';

        await dashboard.openNewDashboard();
        await dashboard.addSavedSearch(testData.SESSION_WITH_CONTROL_TITLE);
        await dashboard.waitForRenderComplete();
        const targetControlId = await dashboard.getDashboardControlId();
        await dashboard.saveDashboard(targetDashboard);

        await discover.goto({ queryMode: 'esql', savedSearchId: discoverSessionId });
        await discover.waitUntilTabIsLoaded();
        await discover.openSaveSearchAsModal();
        await discover.saveModal.fillTitle('Standalone session copy');
        await discover.saveModal.selectExistingDashboard(targetDashboard);
        await page.testSubj.click('confirmSaveSavedObjectButton');
        await page.waitForURL(/\/app\/dashboards/);
        await dashboard.waitForRenderComplete();

        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        await expect(dashboard.getDashboardControlsLocator()).toHaveCount(1);
        await expect(page.locator(`[data-control-id="${targetControlId}"]`)).toBeVisible();
      }
    );
  }
);
