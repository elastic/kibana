/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  DASHBOARD_DEFAULT_INDEX_TITLE,
  DASHBOARD_SAVED_SEARCH_ARCHIVE,
  FEW_PANELS_DASHBOARD_TITLE,
} from '../constants';
import { findImportedSavedObjectId } from '../../utils/migration_smoke_helpers';

const FEW_PANELS_PANEL_TITLES = [
  'Rendering Test: heatmap',
  'Rendering Test: guage',
  'Rendering Test: datatable',
] as const;

let fewPanelsDashboardId = '';

spaceTest.describe('Dashboard clone', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    const imported = await scoutSpace.savedObjects.load(DASHBOARD_SAVED_SEARCH_ARCHIVE);
    fewPanelsDashboardId = findImportedSavedObjectId(
      imported,
      'dashboard',
      FEW_PANELS_DASHBOARD_TITLE
    );
    await scoutSpace.uiSettings.setDefaultIndex(DASHBOARD_DEFAULT_INDEX_TITLE);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'auto-increments titles, respects overrides, and preserves panels',
    async ({ pageObjects, page }) => {
      const cloneOf = (n: number) => `${FEW_PANELS_DASHBOARD_TITLE} (${n})`;

      const expectCurrentDashboardTitle = async (expectedTitle: string) => {
        await expect(page.testSubj.locator('breadcrumb last')).toContainText(expectedTitle);
      };

      // After save-as-copy the dashboard app navigates to /view/<new-id>?_g=…
      const getCurrentDashboardId = (): string => {
        const url = page.url();
        const match = url.match(/#\/view\/([^?]+)/);
        expect(match, `Expected to be on a dashboard view, got URL: ${url}`).not.toBeNull();
        // expect() above guarantees match is non-null at runtime.
        return match![1];
      };

      const expectSourcePanelTitles = async () => {
        await expect
          .poll(async () => [...(await pageObjects.dashboard.getPanelTitles())].sort())
          .toStrictEqual([...FEW_PANELS_PANEL_TITLES].sort());
      };

      let clone1Id = '';

      await spaceTest.step('clone suggests "(1)"', async () => {
        await pageObjects.dashboard.openDashboardWithId(fewPanelsDashboardId);
        await pageObjects.dashboard.ensureEditMode();
        await pageObjects.dashboard.saveDashboardAsCopy();
        clone1Id = getCurrentDashboardId();
        await expectCurrentDashboardTitle(cloneOf(1));
      });

      await spaceTest.step('the clone contains every source panel', async () => {
        // Step 1's save-as-copy left us on clone (1) already; no nav needed.
        await expect
          .poll(() => pageObjects.dashboard.getPanelCount())
          .toBe(FEW_PANELS_PANEL_TITLES.length);
        await expectSourcePanelTitles();
      });

      await spaceTest.step('cloning "(1)" suggests "(2)"', async () => {
        await pageObjects.dashboard.ensureEditMode();
        await pageObjects.dashboard.saveDashboardAsCopy();
        await expectCurrentDashboardTitle(cloneOf(2));
      });

      await spaceTest.step('cloning with a title override saves with that override', async () => {
        await pageObjects.dashboard.openDashboardWithId(clone1Id);
        await pageObjects.dashboard.ensureEditMode();
        await pageObjects.dashboard.saveDashboardAsCopy(cloneOf(20));
        await expectCurrentDashboardTitle(cloneOf(20));
      });

      await spaceTest.step(
        'subsequent clones increment from the highest existing index',
        async () => {
          await pageObjects.dashboard.openDashboardWithId(clone1Id);
          await pageObjects.dashboard.ensureEditMode();
          await pageObjects.dashboard.saveDashboardAsCopy();
          await expectCurrentDashboardTitle(cloneOf(21));
        }
      );
    }
  );
});
