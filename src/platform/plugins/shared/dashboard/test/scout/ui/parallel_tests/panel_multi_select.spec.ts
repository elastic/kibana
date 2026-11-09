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

let fewPanelsDashboardId = '';

spaceTest.describe('Panel multi-selection', { tag: tags.deploymentAgnostic }, () => {
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
    'removes the selected panels in one step that can be undone',
    async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openDashboardWithId(fewPanelsDashboardId);
      await pageObjects.dashboard.switchToEditMode();

      const initialPanelCount = await pageObjects.dashboard.getPanelCount();
      expect(initialPanelCount).toBeGreaterThan(2);

      const [firstTitle, secondTitle] = await pageObjects.dashboard.getPanelTitles();
      const firstPanel = pageObjects.dashboard.getPanelHoverActionsLocator(firstTitle);
      const secondPanel = pageObjects.dashboard.getPanelHoverActionsLocator(secondTitle);
      const toolbar = page.testSubj.locator('dashboardSelectedPanelsToolbar');
      const selectedCount = page.testSubj.locator('dashboardSelectedPanelsCount');

      await spaceTest.step('Cmd/Ctrl+click starts the selection', async () => {
        const box = await firstPanel.boundingBox();
        expect(box).not.toBeNull();
        // Near the bottom-left corner, away from the hover actions and the panel's own controls.
        // Kibana picks Cmd or Ctrl from the browser's user agent, which can differ from the host OS
        // that `ControlOrMeta` is resolved against, so both keys are held.
        await firstPanel.click({
          modifiers: ['Control', 'Meta'],
          position: { x: 8, y: (box?.height ?? 16) - 8 },
        });
        await expect(toolbar).toBeVisible();
        await expect(selectedCount).toHaveText('1 selected');
      });

      await spaceTest.step('the checkbox of another panel adds it to the selection', async () => {
        await secondPanel.getByRole('checkbox', { name: 'Select panel', exact: true }).click();
        await expect(selectedCount).toHaveText('2 selected');
      });

      await spaceTest.step('Remove deletes both panels and clears the selection', async () => {
        await page.testSubj.click('dashboardSelectedPanelsRemove');
        await expect.poll(() => pageObjects.dashboard.getPanelCount()).toBe(initialPanelCount - 2);
        await expect(toolbar).toBeHidden();
      });

      await spaceTest.step('a single undo restores both panels', async () => {
        await page.getByRole('button', { name: 'Undo', exact: true }).click();
        await expect.poll(() => pageObjects.dashboard.getPanelCount()).toBe(initialPanelCount);
      });
    }
  );
});
