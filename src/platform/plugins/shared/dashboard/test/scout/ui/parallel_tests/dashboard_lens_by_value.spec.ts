/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, expect, tags } from '@kbn/scout';
import type { PageObjects } from '@kbn/scout';

const KIBANA_ARCHIVE_PATH =
  'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json';
const DATA_VIEW_NAME = 'logstash-*';
const LENS_TITLE = 'Artistpreviouslyknownaslens';

let lensSavedObjectId = '';

spaceTest.describe('Dashboard lens by value', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const importedObjects = await scoutSpace.savedObjects.load(KIBANA_ARCHIVE_PATH);
    const lensObject = importedObjects.find(
      (savedObject) => savedObject.type === 'lens' && savedObject.title === LENS_TITLE
    );
    expect(
      lensObject,
      `Lens saved object "${LENS_TITLE}" was not found in ${KIBANA_ARCHIVE_PATH}`
    ).toBeTruthy();
    lensSavedObjectId = lensObject!.id;

    await scoutSpace.uiSettings.setDefaultIndex(DATA_VIEW_NAME);
    await scoutSpace.uiSettings.setDefaultTime({
      from: 'Sep 22, 2015 @ 00:00:00.000',
      to: 'Sep 23, 2015 @ 00:00:00.000',
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.dashboard.goto();
    await pageObjects.dashboard.openNewDashboard();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  const addByValueLensPanel = async (pageObjects: PageObjects) => {
    await pageObjects.dashboard.addLens(LENS_TITLE);
    await pageObjects.dashboard.clonePanel(LENS_TITLE);
    await pageObjects.dashboard.removePanel(LENS_TITLE);
    await pageObjects.dashboard.waitForRenderComplete();
  };

  spaceTest('can add a lens panel by value', async ({ pageObjects }) => {
    await spaceTest.step('add by value panel', async () => {
      await addByValueLensPanel(pageObjects);
    });

    await spaceTest.step('verify panel count', async () => {
      await expect.poll(async () => pageObjects.dashboard.getPanelCount()).toBe(1);
    });
  });

  spaceTest(
    'edits to a by value lens panel are properly applied',
    async ({ pageObjects, page }) => {
      await spaceTest.step('add by value panel', async () => {
        await addByValueLensPanel(pageObjects);
      });

      await spaceTest.step('edit panel in Lens and switch to pie', async () => {
        await pageObjects.dashboard.navigateToLensEditorFromPanel(`${LENS_TITLE} (copy)`);
        await pageObjects.lens.switchToVisualization('pie');
        await pageObjects.lens.saveAndReturn();
      });

      await spaceTest.step('verify partition chart renders', async () => {
        await pageObjects.dashboard.waitForRenderComplete();
        await expect(page.testSubj.locator('partitionVisChart')).toBeVisible();
      });
    }
  );

  spaceTest(
    'editing and saving a lens by value panel retains number of panels',
    async ({ pageObjects }) => {
      await spaceTest.step('add by value panel', async () => {
        await addByValueLensPanel(pageObjects);
      });

      const originalPanelCount = await pageObjects.dashboard.getPanelCount();

      await spaceTest.step('edit panel in Lens and switch to treemap', async () => {
        await pageObjects.dashboard.navigateToLensEditorFromPanel(`${LENS_TITLE} (copy)`);
        await pageObjects.lens.switchToVisualization('treemap');
        await pageObjects.lens.saveAndReturn();
      });

      await spaceTest.step('verify panel count unchanged', async () => {
        await pageObjects.dashboard.waitForRenderComplete();
        await expect
          .poll(async () => pageObjects.dashboard.getPanelCount())
          .toBe(originalPanelCount);
      });
    }
  );

  spaceTest(
    'updates panel on dashboard when a by value panel is saved to library',
    async ({ pageObjects }) => {
      const newTitle = 'look out library, here I come!';

      await spaceTest.step('add by value panel', async () => {
        await addByValueLensPanel(pageObjects);
      });

      const originalPanelCount = await pageObjects.dashboard.getPanelCount();

      await spaceTest.step('save panel to library from dashboard', async () => {
        await pageObjects.dashboard.saveToLibrary(newTitle, `${LENS_TITLE} (copy)`);
      });

      await spaceTest.step('verify panel count and title', async () => {
        await pageObjects.dashboard.waitForRenderComplete();
        await expect
          .poll(async () => pageObjects.dashboard.getPanelCount())
          .toBe(originalPanelCount);
        const titles = await pageObjects.dashboard.getPanelTitles();
        expect(titles).toContain(newTitle);
      });
    }
  );

  spaceTest(
    'is no longer linked to a dashboard after opening Lens directly',
    async ({ page, pageObjects }) => {
      await spaceTest.step('open Lens editor directly', async () => {
        await page.gotoApp('lens', { hash: `/edit/${lensSavedObjectId}` });
        await pageObjects.lens.waitForLensApp();
      });

      await spaceTest.step('verify no return-to-origin switch', async () => {
        await expect(page.testSubj.locator('returnToOriginModeSwitch')).toBeHidden();
      });
    }
  );
});
