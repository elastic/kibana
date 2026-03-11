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
  LENS_BASIC_DATA_VIEW,
  LENS_BASIC_KIBANA_ARCHIVE,
  LENS_BASIC_TIME_RANGE,
  LENS_BASIC_TITLE,
} from '../constants';

const PANEL_TITLES_MARKDOWN_CONTENT = 'Panel title test markdown';
const PANEL_TITLES_LIBRARY_DESCRIPTION = 'Vis library description';
const PANEL_TITLES_CUSTOM_TITLE = 'Custom title';
const PANEL_TITLES_CUSTOM_TITLE_CAPS = 'Custom Title';
const PANEL_TITLES_CUSTOM_DESCRIPTION = 'Custom description';

spaceTest.describe('Panel titles (dashboard)', { tag: tags.deploymentAgnostic }, () => {
  let lensSavedObjectId = '';

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
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
    await pageObjects.dashboard.waitForRenderComplete();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  const getClonedPanelTitle = async (pageObjects: PageObjects) => {
    const titles = await pageObjects.dashboard.getPanelTitles();
    const clonedTitle = titles.find((title) => title.includes('(copy)'));
    expect(clonedTitle, 'Cloned panel title not found after duplicating').toBeTruthy();
    return clonedTitle!;
  };

  spaceTest('new panel by value has empty title', async ({ pageObjects }) => {
    await spaceTest.step('add markdown panel by value', async () => {
      await pageObjects.dashboard.addMarkdownPanel(PANEL_TITLES_MARKDOWN_CONTENT);
    });

    await spaceTest.step('verify title is empty', async () => {
      await expect(pageObjects.dashboard.getPanelTitlesLocator()).toHaveCount(0);
    });
  });

  spaceTest('blank title clears unsaved changes', async ({ page, pageObjects }, testInfo) => {
    await spaceTest.step('add markdown panel by value', async () => {
      await pageObjects.dashboard.addMarkdownPanel(PANEL_TITLES_MARKDOWN_CONTENT);
    });

    await spaceTest.step('save dashboard', async () => {
      await pageObjects.dashboard.saveDashboard(`Panel titles - ${testInfo.title}`);
    });

    await spaceTest.step('set blank title', async () => {
      await pageObjects.dashboard.openCustomizePanel();
      await pageObjects.dashboard.setCustomPanelTitle('');
      await pageObjects.dashboard.saveCustomizePanel();
    });

    await spaceTest.step('verify title is empty and badge is gone', async () => {
      await expect(pageObjects.dashboard.getPanelTitlesLocator()).toHaveCount(0);
      await expect(page.testSubj.locator('dashboardUnsavedChangesBadge')).toHaveCount(0);
    });
  });

  spaceTest(
    'custom title causes unsaved changes and saving clears it',
    async ({ page, pageObjects }, testInfo) => {
      await spaceTest.step('add markdown panel by value', async () => {
        await pageObjects.dashboard.addMarkdownPanel(PANEL_TITLES_MARKDOWN_CONTENT);
      });

      await spaceTest.step('save dashboard', async () => {
        await pageObjects.dashboard.saveDashboard(`Panel titles - ${testInfo.title}`);
      });

      await spaceTest.step('set custom title and save', async () => {
        await pageObjects.dashboard.openCustomizePanel();
        await pageObjects.dashboard.setCustomPanelTitle(PANEL_TITLES_CUSTOM_TITLE);
        await pageObjects.dashboard.saveCustomizePanel();
        await expect(page.testSubj.locator('dashboardUnsavedChangesBadge')).toBeVisible();
      });

      await spaceTest.step('verify title and clear unsaved changes', async () => {
        await expect(pageObjects.dashboard.getPanelTitlesLocator()).toHaveText(
          PANEL_TITLES_CUSTOM_TITLE
        );
        await pageObjects.dashboard.clearUnsavedChanges();
        await expect(page.testSubj.locator('dashboardUnsavedChangesBadge')).toHaveCount(0);
      });
    }
  );

  spaceTest('reset title is hidden on a by value panel', async ({ pageObjects }) => {
    await spaceTest.step('add markdown panel by value', async () => {
      await pageObjects.dashboard.addMarkdownPanel(PANEL_TITLES_MARKDOWN_CONTENT);
    });

    await spaceTest.step('set custom title', async () => {
      await pageObjects.dashboard.openCustomizePanel();
      await pageObjects.dashboard.setCustomPanelTitle(PANEL_TITLES_CUSTOM_TITLE);
      await pageObjects.dashboard.saveCustomizePanel();
    });

    await spaceTest.step('verify reset title button is missing', async () => {
      await pageObjects.dashboard.openCustomizePanel(PANEL_TITLES_CUSTOM_TITLE);
      await expect(pageObjects.dashboard.getResetCustomPanelTitleButton()).toHaveCount(0);
      await pageObjects.dashboard.closeCustomizePanel();
    });
  });

  spaceTest('reset description is hidden on a by value panel', async ({ pageObjects }) => {
    await spaceTest.step('add markdown panel by value', async () => {
      await pageObjects.dashboard.addMarkdownPanel(PANEL_TITLES_MARKDOWN_CONTENT);
    });

    await spaceTest.step('set custom description', async () => {
      await pageObjects.dashboard.openCustomizePanel();
      await pageObjects.dashboard.setCustomPanelDescription(PANEL_TITLES_CUSTOM_DESCRIPTION);
      await pageObjects.dashboard.saveCustomizePanel();
    });

    await spaceTest.step('verify reset description button is missing', async () => {
      await pageObjects.dashboard.openCustomizePanel();
      await expect(pageObjects.dashboard.getResetCustomPanelDescriptionButton()).toHaveCount(0);
      await pageObjects.dashboard.closeCustomizePanel();
    });
  });

  spaceTest(
    'linking a by value panel with a custom title to the library overwrites the custom title',
    async ({ pageObjects }, testInfo) => {
      const libraryTitle = `Vis Library Title - ${testInfo.title.replace(/\s+/g, '-')}`;

      await spaceTest.step('add lens panel from library and clone to by value', async () => {
        await pageObjects.dashboard.addLens(LENS_BASIC_TITLE);
        await pageObjects.dashboard.clonePanel(LENS_BASIC_TITLE);
      });

      await spaceTest.step('set custom title and save to library', async () => {
        const byValueTitle = await getClonedPanelTitle(pageObjects);

        await pageObjects.dashboard.openCustomizePanel(byValueTitle);
        await pageObjects.dashboard.setCustomPanelTitle(PANEL_TITLES_CUSTOM_TITLE);
        await pageObjects.dashboard.saveCustomizePanel();
        await pageObjects.dashboard.saveToLibrary(libraryTitle, PANEL_TITLES_CUSTOM_TITLE);
      });

      await spaceTest.step('verify panel title matches library title', async () => {
        await expect
          .poll(async () => await pageObjects.dashboard.getPanelTitles())
          .toContain(libraryTitle);
      });
    }
  );

  spaceTest(
    'resetting title on a by reference panel uses the library title',
    async ({ pageObjects }) => {
      await spaceTest.step('add lens panel from library', async () => {
        await pageObjects.dashboard.addLens(LENS_BASIC_TITLE);
      });

      await spaceTest.step('set custom title and reset', async () => {
        await pageObjects.dashboard.openCustomizePanel(LENS_BASIC_TITLE);
        await pageObjects.dashboard.setCustomPanelTitle(PANEL_TITLES_CUSTOM_TITLE_CAPS);
        await pageObjects.dashboard.saveCustomizePanel();

        await pageObjects.dashboard.openCustomizePanel(PANEL_TITLES_CUSTOM_TITLE_CAPS);
        await pageObjects.dashboard.resetCustomPanelTitle();
        await pageObjects.dashboard.saveCustomizePanel();
      });

      await spaceTest.step('verify title reset to library title', async () => {
        await pageObjects.dashboard.openCustomizePanel(LENS_BASIC_TITLE);
        const panelTitle = await pageObjects.dashboard.getCustomPanelTitle();
        expect(panelTitle).toBe(LENS_BASIC_TITLE);
        await pageObjects.dashboard.closeCustomizePanel();
      });
    }
  );

  spaceTest(
    'resetting description on a by reference panel uses the library description',
    async ({ pageObjects, scoutSpace, kbnClient }) => {
      await spaceTest.step('update library description via API', async () => {
        await kbnClient.request({
          method: 'PUT',
          path: `/s/${scoutSpace.id}/api/saved_objects/lens/${lensSavedObjectId}`,
          body: {
            attributes: { description: PANEL_TITLES_LIBRARY_DESCRIPTION },
          },
        });
      });

      await spaceTest.step('add lens panel from library', async () => {
        await pageObjects.dashboard.addLens(LENS_BASIC_TITLE);
      });

      await spaceTest.step('set custom description and reset', async () => {
        await pageObjects.dashboard.openCustomizePanel(LENS_BASIC_TITLE);
        await pageObjects.dashboard.setCustomPanelDescription(PANEL_TITLES_CUSTOM_DESCRIPTION);
        await pageObjects.dashboard.saveCustomizePanel();

        await pageObjects.dashboard.openCustomizePanel(LENS_BASIC_TITLE);
        await pageObjects.dashboard.resetCustomPanelDescription();
        await pageObjects.dashboard.saveCustomizePanel();
      });

      await spaceTest.step('verify description reset to library description', async () => {
        await pageObjects.dashboard.openCustomizePanel(LENS_BASIC_TITLE);
        const panelDescription = await pageObjects.dashboard.getCustomPanelDescription();
        expect(panelDescription).toBe(PANEL_TITLES_LIBRARY_DESCRIPTION);
        await pageObjects.dashboard.closeCustomizePanel();
      });
    }
  );

  spaceTest(
    'unlinking a by reference panel with a custom title keeps the title',
    async ({ pageObjects }) => {
      await spaceTest.step('add lens panel from library', async () => {
        await pageObjects.dashboard.addLens(LENS_BASIC_TITLE);
      });

      await spaceTest.step('set custom title and unlink', async () => {
        await pageObjects.dashboard.openCustomizePanel(LENS_BASIC_TITLE);
        await pageObjects.dashboard.setCustomPanelTitle(PANEL_TITLES_CUSTOM_TITLE);
        await pageObjects.dashboard.saveCustomizePanel();
        await pageObjects.dashboard.unlinkFromLibrary(PANEL_TITLES_CUSTOM_TITLE);
      });

      await spaceTest.step('verify panel title is preserved', async () => {
        const [panelTitle] = await pageObjects.dashboard.getPanelTitles();
        expect(panelTitle).toBe('Custom title');
      });
    }
  );

  spaceTest(
    'linking a by value panel with a blank title sets the panel title to the library title',
    async ({ pageObjects }, testInfo) => {
      const libraryTitle = `Vis Library Title - ${testInfo.title.replace(/\s+/g, '-')}`;

      await spaceTest.step('add lens panel from library and clone to by value', async () => {
        await pageObjects.dashboard.addLens(LENS_BASIC_TITLE);
        await pageObjects.dashboard.clonePanel(LENS_BASIC_TITLE);
        await pageObjects.dashboard.removePanel(LENS_BASIC_TITLE);
      });

      await spaceTest.step('set blank title and save to library', async () => {
        const clonedTitle = await getClonedPanelTitle(pageObjects);
        await pageObjects.dashboard.openCustomizePanel(clonedTitle);
        await pageObjects.dashboard.setCustomPanelTitle('');
        await pageObjects.dashboard.saveCustomizePanel();
        await pageObjects.dashboard.saveToLibrary(libraryTitle);
      });

      await spaceTest.step('verify panel title matches library title', async () => {
        const [panelTitle] = await pageObjects.dashboard.getPanelTitles();
        expect(panelTitle).toBe(libraryTitle);
      });
    }
  );

  spaceTest(
    'unlinking a by reference panel without a custom title keeps the library title',
    async ({ pageObjects }) => {
      await spaceTest.step('add lens panel from library', async () => {
        await pageObjects.dashboard.addLens(LENS_BASIC_TITLE);
      });

      await spaceTest.step('unlink panel and verify title', async () => {
        await pageObjects.dashboard.unlinkFromLibrary(LENS_BASIC_TITLE);
        const [panelTitle] = await pageObjects.dashboard.getPanelTitles();
        expect(panelTitle).toBe(LENS_BASIC_TITLE);
      });
    }
  );
});
