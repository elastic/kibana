/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';
import { DISCOVER_LOGSTASH_ALL_ROLE } from '../../fixtures/common/custom_roles';
import { createShareHelper } from '../../fixtures/common/share_helper';

spaceTest.describe(
  'Discover shared links in session storage',
  { tag: testData.DISCOVER_STATEFUL_TAGS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover.json'
      );
      await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
      await scoutSpace.uiSettings.set({ 'state:storeInSessionStorage': true });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(DISCOVER_LOGSTASH_ALL_ROLE);
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilSearchingHasFinished();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(
        'defaultIndex',
        'timepicker:timeDefaults',
        'state:storeInSessionStorage'
      );
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'opens the copied snapshot URL and restores the time range',
      async ({ page, pageObjects }) => {
        const share = createShareHelper(page);

        await share.openShareModal();
        const sharedUrl = await share.getSharedUrl();
        expect(sharedUrl).toMatch(/\/app\/r.*$/);
        await share.closeShareModal();

        const actualTime = await pageObjects.datePicker.getTimeConfig();

        await page.evaluate(() => window.sessionStorage.clear());
        await page.goto(sharedUrl);
        await expect.poll(() => page.url()).toContain('/app/discover');

        expect(page.url()).toContain('discover');
        expect(await pageObjects.datePicker.getTimeConfig()).toStrictEqual(actualTime);
      }
    );

    spaceTest('does not crash when reopening the current hashed URL', async ({ page }) => {
      const currentUrl = page.url();

      await page.evaluate(() => window.sessionStorage.clear());
      await page.goto(currentUrl);
      await expect.poll(() => page.url()).toContain('/app/discover');

      expect(page.url()).toContain('discover');
    });
  }
);
