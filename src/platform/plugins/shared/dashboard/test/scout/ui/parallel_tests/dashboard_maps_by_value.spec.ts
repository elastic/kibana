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
import type { PageObjects, ScoutPage } from '@kbn/scout';
import { LENS_BASIC_KIBANA_ARCHIVE } from '../constants';

const MAPS_LAYER_GROUP_TITLE = 'Layer group';
const MAPS_LIBRARY_NAME_PREFIX = 'my map';

spaceTest.describe('Maps by-value panels (dashboard)', { tag: tags.deploymentAgnostic }, () => {
  let mapCounter = 0;
  let dashboardUrl = '';

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(LENS_BASIC_KIBANA_ARCHIVE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects, page }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.goto();
    await pageObjects.dashboard.openNewDashboard();
    dashboardUrl = page.url();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  const createAndAddMapByValue = async (pageObjects: PageObjects) => {
    await pageObjects.dashboard.addMapPanel();
    await pageObjects.maps.waitForRenderComplete();
    await pageObjects.maps.saveAndReturnButton.click();
    await pageObjects.dashboard.waitForRenderComplete();
  };

  const openMapEditorAndAddLayer = async (pageObjects: PageObjects) => {
    const [panelTitle] = await pageObjects.dashboard.getPanelTitles();
    await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel', panelTitle);
    await pageObjects.maps.waitForRenderComplete();

    await pageObjects.maps.addLayerButton.click();
    await pageObjects.maps.layerAddForm.waitFor({ state: 'visible' });
    await pageObjects.maps.selectLayerWizardByTitle(MAPS_LAYER_GROUP_TITLE);
    await pageObjects.maps.importFileButton.click();
  };

  const saveMapByValueAndReturn = async (pageObjects: PageObjects) => {
    await pageObjects.maps.saveAndReturnButton.click();
    await pageObjects.dashboard.waitForRenderComplete();
  };

  const saveMapToLibraryAndReturn = async (pageObjects: PageObjects) => {
    await pageObjects.maps.saveButton.click();
    await pageObjects.maps.saveFromModal(`${MAPS_LIBRARY_NAME_PREFIX} ${mapCounter++}`, {
      redirectToOrigin: true,
    });
    await pageObjects.dashboard.waitForRenderComplete();
  };

  const saveMapToLibraryAndStay = async (pageObjects: PageObjects, page: ScoutPage) => {
    await pageObjects.maps.saveButton.click();
    await pageObjects.maps.saveFromModal(`${MAPS_LIBRARY_NAME_PREFIX} ${mapCounter++}`, {
      redirectToOrigin: false,
    });
    await page.goto(dashboardUrl);
    await pageObjects.dashboard.waitForRenderComplete();
  };

  spaceTest('adds a map by value', async ({ pageObjects }) => {
    await spaceTest.step('add map panel', async () => {
      await createAndAddMapByValue(pageObjects);
    });

    await spaceTest.step('verify panel count', async () => {
      expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
    });
  });

  spaceTest('editing a by-value map updates the panel', async ({ pageObjects }) => {
    await spaceTest.step('add map panel', async () => {
      await createAndAddMapByValue(pageObjects);
    });

    await spaceTest.step('edit map panel', async () => {
      await openMapEditorAndAddLayer(pageObjects);
      await saveMapByValueAndReturn(pageObjects);
    });

    await spaceTest.step('verify panel count and layer', async () => {
      expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
      await expect(pageObjects.maps.getLayerToggleButton(MAPS_LAYER_GROUP_TITLE)).toBeVisible();
    });
  });

  spaceTest('saving to library updates the panel', async ({ pageObjects }) => {
    await spaceTest.step('add map panel', async () => {
      await createAndAddMapByValue(pageObjects);
    });

    await spaceTest.step('edit map panel and save to library', async () => {
      await openMapEditorAndAddLayer(pageObjects);
      await saveMapToLibraryAndReturn(pageObjects);
    });

    await spaceTest.step('verify layer exists', async () => {
      await expect(pageObjects.maps.getLayerToggleButton(MAPS_LAYER_GROUP_TITLE)).toBeVisible();
    });
  });

  spaceTest(
    'saving to library without return does not update panel',
    async ({ pageObjects, page }) => {
      await spaceTest.step('add map panel', async () => {
        await createAndAddMapByValue(pageObjects);
      });

      await spaceTest.step('save to library without redirect', async () => {
        await openMapEditorAndAddLayer(pageObjects);
        await saveMapToLibraryAndStay(pageObjects, page);
      });

      await spaceTest.step('verify layer does not exist', async () => {
        await expect(pageObjects.maps.getLayerToggleButton(MAPS_LAYER_GROUP_TITLE)).toBeHidden();
      });
    }
  );
});
