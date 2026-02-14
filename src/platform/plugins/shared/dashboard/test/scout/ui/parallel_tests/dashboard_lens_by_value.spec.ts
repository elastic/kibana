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
import type { PageObjects } from '@kbn/scout';
import {
  LENS_BASIC_KIBANA_ARCHIVE,
  LENS_BASIC_DATA_VIEW,
  LENS_BASIC_TITLE,
  LENS_BASIC_TIME_RANGE,
} from '../constants';

spaceTest.describe('Lens by-value panels (dashboard)', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  let lensSavedObjectId = '';

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const importedObjects = await scoutSpace.savedObjects.load(LENS_BASIC_KIBANA_ARCHIVE);
    const lensObject = importedObjects.find(
      (savedObject) => savedObject.type === 'lens' && savedObject.title === LENS_BASIC_TITLE
    );
    expect(
      lensObject,
      `Lens saved object "${LENS_BASIC_TITLE}" was not found in ${LENS_BASIC_KIBANA_ARCHIVE}`
    ).toBeTruthy();
    lensSavedObjectId = lensObject!.id;

    await scoutSpace.uiSettings.setDefaultIndex(LENS_BASIC_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(LENS_BASIC_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.goto();
    await pageObjects.dashboard.openNewDashboard();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  const addByValueLensPanel = async (pageObjects: PageObjects) => {
    await pageObjects.dashboard.addLens(LENS_BASIC_TITLE);
    await pageObjects.dashboard.clonePanel(LENS_BASIC_TITLE);
    await pageObjects.dashboard.removePanel(LENS_BASIC_TITLE);
  };

  spaceTest('by-value panel retains count after edit', async ({ pageObjects }) => {
    await spaceTest.step('add by value panel', async () => {
      await addByValueLensPanel(pageObjects);
      expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
    });

    const originalPanelCount = await pageObjects.dashboard.getPanelCount();

    await spaceTest.step('edit panel in Lens and switch to treemap', async () => {
      await pageObjects.dashboard.navigateToLensEditorFromPanel(`${LENS_BASIC_TITLE} (copy)`);
      await pageObjects.lens.switchToVisualization('treemap');
      await pageObjects.lens.saveAndReturn();
    });

    await spaceTest.step('verify panel count unchanged', async () => {
      expect(await pageObjects.dashboard.getPanelCount()).toBe(originalPanelCount);
    });
  });

  spaceTest(
    'edits to a by value lens panel are properly applied',
    async ({ pageObjects, page }) => {
      await spaceTest.step('add by value panel', async () => {
        await addByValueLensPanel(pageObjects);
      });

      await spaceTest.step('edit panel in Lens and switch to pie', async () => {
        await pageObjects.dashboard.navigateToLensEditorFromPanel(`${LENS_BASIC_TITLE} (copy)`);
        await pageObjects.lens.switchToVisualization('pie');
        await pageObjects.lens.saveAndReturn();
      });

      await spaceTest.step('verify partition chart renders', async () => {
        await expect(page.testSubj.locator('partitionVisChart')).toBeVisible();
      });
    }
  );

  spaceTest('saving to library keeps panel count', async ({ pageObjects }) => {
    const newTitle = 'look out library, here I come!';

    await spaceTest.step('add by value panel', async () => {
      await addByValueLensPanel(pageObjects);
    });

    const originalPanelCount = await pageObjects.dashboard.getPanelCount();

    await spaceTest.step('save panel to library from dashboard', async () => {
      await pageObjects.dashboard.saveToLibrary(newTitle, `${LENS_BASIC_TITLE} (copy)`);
    });

    await spaceTest.step('verify panel count and title', async () => {
      expect(await pageObjects.dashboard.getPanelCount()).toBe(originalPanelCount);
      const titles = await pageObjects.dashboard.getPanelTitles();
      expect(titles).toContain(newTitle);
    });
  });

  spaceTest('opening Lens directly drops dashboard link', async ({ page, pageObjects }) => {
    await spaceTest.step('open Lens editor directly', async () => {
      await page.gotoApp('lens', { hash: `/edit/${lensSavedObjectId}` });
      await pageObjects.lens.waitForLensApp();
    });

    await spaceTest.step('verify no return-to-origin switch', async () => {
      await expect(page.testSubj.locator('returnToOriginModeSwitch')).toBeHidden();
    });
  });
});
