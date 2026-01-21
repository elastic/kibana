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
const VIS_LIBRARY_DESCRIPTION = 'Vis library description';
const MARKDOWN_CONTENT = 'Panel title test markdown';

let lensSavedObjectId = '';

spaceTest.describe('Dashboard panel titles', { tag: tags.ESS_ONLY }, () => {
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

  const addLensPanelFromLibrary = async (pageObjects: PageObjects) => {
    await pageObjects.dashboard.addLens(LENS_TITLE);
    await pageObjects.dashboard.waitForRenderComplete();
  };

  const addMarkdownPanelByValue = async (pageObjects: PageObjects) => {
    await pageObjects.dashboard.addMarkdownPanel(MARKDOWN_CONTENT);
    await pageObjects.dashboard.waitForRenderComplete();
  };

  const getClonedPanelTitle = async (pageObjects: PageObjects) => {
    const titles = await pageObjects.dashboard.getPanelTitles();
    const clonedTitle = titles.find((title) => title.includes('(copy)'));
    expect(clonedTitle, 'Cloned panel title not found after duplicating').toBeTruthy();
    return clonedTitle!;
  };

  spaceTest('by value panel can have an empty title', async ({ pageObjects }) => {
    await spaceTest.step('add markdown panel by value', async () => {
      await addMarkdownPanelByValue(pageObjects);
    });

    await spaceTest.step('set custom title to empty and save', async () => {
      await pageObjects.dashboard.openCustomizePanel();
      await pageObjects.dashboard.setCustomPanelTitle('');
      await pageObjects.dashboard.saveCustomizePanel();
    });

    await spaceTest.step('verify panel title is empty', async () => {
      await expect(pageObjects.dashboard.getPanelTitlesLocator()).toHaveCount(0);
    });
  });

  spaceTest(
    'saving a by value panel with blank title clears unsaved changes',
    async ({ pageObjects }) => {
      await spaceTest.step('add markdown panel by value', async () => {
        await addMarkdownPanelByValue(pageObjects);
      });

      await spaceTest.step('set blank title and save', async () => {
        await pageObjects.dashboard.openCustomizePanel();
        await pageObjects.dashboard.setCustomPanelTitle('');
        await pageObjects.dashboard.saveCustomizePanel();
      });
    }
  );

  spaceTest('custom title causes unsaved changes and saving clears it', async ({ pageObjects }) => {
    await spaceTest.step('add markdown panel by value', async () => {
      await addMarkdownPanelByValue(pageObjects);
    });

    await spaceTest.step('set custom title and save', async () => {
      await pageObjects.dashboard.openCustomizePanel();
      await pageObjects.dashboard.setCustomPanelTitle('Custom title');
      await pageObjects.dashboard.saveCustomizePanel();
    });

    await spaceTest.step('verify title and clear unsaved changes', async () => {
      await expect(pageObjects.dashboard.getPanelTitlesLocator()).toHaveText('Custom title');
    });
  });

  spaceTest('reset title is hidden on a by value panel', async ({ pageObjects }) => {
    await spaceTest.step('add markdown panel by value', async () => {
      await addMarkdownPanelByValue(pageObjects);
    });

    await spaceTest.step('set custom title', async () => {
      await pageObjects.dashboard.openCustomizePanel();
      await pageObjects.dashboard.setCustomPanelTitle('Some title');
      await pageObjects.dashboard.saveCustomizePanel();
    });

    await spaceTest.step('verify reset title button is missing', async () => {
      await pageObjects.dashboard.openCustomizePanel('Some title');
      await expect(pageObjects.dashboard.getResetCustomPanelTitleButton()).toHaveCount(0);
      await pageObjects.dashboard.closeCustomizePanel();
    });
  });

  spaceTest('reset description is hidden on a by value panel', async ({ pageObjects }) => {
    await spaceTest.step('add markdown panel by value', async () => {
      await addMarkdownPanelByValue(pageObjects);
    });

    await spaceTest.step('set custom description', async () => {
      await pageObjects.dashboard.openCustomizePanel();
      await pageObjects.dashboard.setCustomPanelDescription('Some description');
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
        await addLensPanelFromLibrary(pageObjects);
        await pageObjects.dashboard.clonePanel(LENS_TITLE);
      });

      await spaceTest.step('set custom title and save to library', async () => {
        const byValueTitle = await getClonedPanelTitle(pageObjects);

        await pageObjects.dashboard.openCustomizePanel(byValueTitle);
        await pageObjects.dashboard.setCustomPanelTitle('Custom title');
        await pageObjects.dashboard.saveCustomizePanel();
        await pageObjects.dashboard.saveToLibrary(libraryTitle, 'Custom title');
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
        await addLensPanelFromLibrary(pageObjects);
      });

      await spaceTest.step('set custom title and reset', async () => {
        await pageObjects.dashboard.openCustomizePanel(LENS_TITLE);
        await pageObjects.dashboard.setCustomPanelTitle('Custom Title');
        await pageObjects.dashboard.saveCustomizePanel();

        await pageObjects.dashboard.openCustomizePanel('Custom Title');
        await pageObjects.dashboard.resetCustomPanelTitle();
        await pageObjects.dashboard.saveCustomizePanel();
      });

      await spaceTest.step('verify title reset to library title', async () => {
        await pageObjects.dashboard.openCustomizePanel(LENS_TITLE);
        const panelTitle = await pageObjects.dashboard.getCustomPanelTitle();
        expect(panelTitle).toBe(LENS_TITLE);
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
            attributes: { description: VIS_LIBRARY_DESCRIPTION },
          },
        });
      });

      await spaceTest.step('add lens panel from library', async () => {
        await addLensPanelFromLibrary(pageObjects);
      });

      await spaceTest.step('set custom description and reset', async () => {
        await pageObjects.dashboard.openCustomizePanel(LENS_TITLE);
        await pageObjects.dashboard.setCustomPanelDescription('Custom description');
        await pageObjects.dashboard.saveCustomizePanel();

        await pageObjects.dashboard.openCustomizePanel(LENS_TITLE);
        await pageObjects.dashboard.resetCustomPanelDescription();
        await pageObjects.dashboard.saveCustomizePanel();
      });

      await spaceTest.step('verify description reset to library description', async () => {
        await pageObjects.dashboard.openCustomizePanel(LENS_TITLE);
        const panelDescription = await pageObjects.dashboard.getCustomPanelDescription();
        expect(panelDescription).toBe(VIS_LIBRARY_DESCRIPTION);
        await pageObjects.dashboard.closeCustomizePanel();
      });
    }
  );

  spaceTest(
    'unlinking a by reference panel with a custom title keeps the title',
    async ({ pageObjects }) => {
      await spaceTest.step('add lens panel from library', async () => {
        await addLensPanelFromLibrary(pageObjects);
      });

      await spaceTest.step('set custom title and unlink', async () => {
        await pageObjects.dashboard.openCustomizePanel(LENS_TITLE);
        await pageObjects.dashboard.setCustomPanelTitle('Custom title');
        await pageObjects.dashboard.saveCustomizePanel();
        await pageObjects.dashboard.unlinkFromLibrary('Custom title');
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
        await addLensPanelFromLibrary(pageObjects);
        await pageObjects.dashboard.clonePanel(LENS_TITLE);
        await pageObjects.dashboard.removePanel(LENS_TITLE);
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
        await addLensPanelFromLibrary(pageObjects);
      });

      await spaceTest.step('unlink panel and verify title', async () => {
        await pageObjects.dashboard.unlinkFromLibrary(LENS_TITLE);
        const [panelTitle] = await pageObjects.dashboard.getPanelTitles();
        expect(panelTitle).toBe(LENS_TITLE);
      });
    }
  );
});
