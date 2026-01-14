/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, expect, tags } from '@kbn/scout';

const KIBANA_ARCHIVE_PATH =
  'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana';

// The saved search name - use dashes like FTR does (matches fixture title when dashes become spaces)
const SAVED_SEARCH_NAME = 'Rendering-Test:-saved-search';

spaceTest.describe('Dashboard saved searches by value', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(KIBANA_ARCHIVE_PATH);
    await scoutSpace.uiSettings.set({
      defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
    });
    // Set time range to match the test data
    await scoutSpace.uiSettings.set({
      'timepicker:timeDefaults': JSON.stringify({
        from: 'Sep 22, 2015 @ 00:00:00.000',
        to: 'Sep 23, 2015 @ 00:00:00.000',
      }),
    });
  });

  // Login and navigate to a new dashboard before each test
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.dashboard.goto();
    await pageObjects.dashboard.openNewDashboard();
  });

  // Cleanup after all tests
  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.uiSettings.unset('timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should allow cloning a by ref saved search embeddable to a by value embeddable',
    async ({ pageObjects }) => {
      await spaceTest.step('add saved search from library', async () => {
        await pageObjects.dashboard.addSavedSearch(SAVED_SEARCH_NAME);
        await pageObjects.dashboard.waitForRenderComplete();
      });

      await spaceTest.step('verify initial state - one panel linked to library', async () => {
        const titles = await pageObjects.dashboard.getPanelTitles();
        expect(titles).toHaveLength(1);
        await pageObjects.dashboard.expectLinkedToLibrary(titles[0]);
      });

      await spaceTest.step('clone the panel', async () => {
        const titles = await pageObjects.dashboard.getPanelTitles();
        await pageObjects.dashboard.clonePanel(titles[0]);
      });

      await spaceTest.step(
        'verify clone result - two panels with correct library status',
        async () => {
          const titles = await pageObjects.dashboard.getPanelTitles();
          expect(titles).toHaveLength(2);

          // Original panel remains linked to library
          await pageObjects.dashboard.expectLinkedToLibrary(titles[0]);

          // Cloned panel is NOT linked to library (by value)
          await pageObjects.dashboard.expectNotLinkedToLibrary(titles[1]);
        }
      );
    }
  );

  spaceTest(
    'should allow unlinking a by ref saved search embeddable from library',
    async ({ pageObjects }) => {
      await spaceTest.step('add saved search from library', async () => {
        await pageObjects.dashboard.addSavedSearch(SAVED_SEARCH_NAME);
        await pageObjects.dashboard.waitForRenderComplete();
      });

      await spaceTest.step('verify initial state - panel linked to library', async () => {
        const titles = await pageObjects.dashboard.getPanelTitles();
        expect(titles).toHaveLength(1);
        await pageObjects.dashboard.expectLinkedToLibrary(titles[0]);
      });

      await spaceTest.step('unlink panel from library', async () => {
        const titles = await pageObjects.dashboard.getPanelTitles();
        await pageObjects.dashboard.unlinkFromLibrary(titles[0]);
      });

      await spaceTest.step('verify unlink result - panel no longer linked', async () => {
        const titles = await pageObjects.dashboard.getPanelTitles();
        expect(titles).toHaveLength(1);

        // Panel should now be "by value" (not linked to library)
        await pageObjects.dashboard.expectNotLinkedToLibrary(titles[0]);
      });
    }
  );
});
