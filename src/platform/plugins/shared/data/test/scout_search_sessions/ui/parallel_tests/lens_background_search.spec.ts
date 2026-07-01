/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Migrated from: x-pack/platform/test/search_sessions_integration/tests/apps/lens/search_sessions.ts
 * FTR config:    x-pack/platform/test/search_sessions_integration/config.management.ts
 *
 * Verifies that the Background Search indicator (openBackgroundSearchFlyoutButton) does
 * NOT appear inside the Lens editor, even when the background search feature is globally
 * enabled. Lens does not participate in the background search lifecycle.
 *
 * ES data is loaded once in global.setup.ts.
 * The Lens visualization saved object is loaded per-space in beforeAll.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, LENS_BASIC_KBN_ARCHIVE, DEFAULT_TIME_FROM, DEFAULT_TIME_TO } from '../fixtures';

spaceTest.describe(
  'Lens — background search indicator',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.savedObjects.load(LENS_BASIC_KBN_ARCHIVE);
      await scoutSpace.uiSettings.set({ defaultIndex: 'logstash-*' });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'does not show the background search indicator UI in Lens',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to Visualize listing and open lnsXYvis', async () => {
          // Navigate to Visualize. The visualizationLandingPage test-subject is set
          // asynchronously (via a React useEffect), so use an extended timeout.
          await page.gotoApp('visualize');
          await expect(page.testSubj.locator('visualizationLandingPage')).toBeVisible({
            timeout: 30_000,
          });
          await pageObjects.listingTable.searchForItemTitle('lnsXYvis');
          await page.testSubj.click('visListingTitleLink-lnsXYvis');
          await pageObjects.lens.waitForLensApp();
        });

        await spaceTest.step('set time range so the visualization renders data', async () => {
          await pageObjects.datePicker.setAbsoluteRange({
            from: DEFAULT_TIME_FROM,
            to: DEFAULT_TIME_TO,
          });
        });

        await spaceTest.step('verify Lens shows data and no background search button', async () => {
          await expect(page.testSubj.locator('lnsWorkspace')).not.toContainText(
            'No results found',
            { timeout: 30_000 }
          );

          await expect(page.testSubj.locator('openBackgroundSearchFlyoutButton')).not.toBeVisible();
        });
      }
    );
  }
);
