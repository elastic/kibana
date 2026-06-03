/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  testData,
  addFilterWithoutStrictCheck,
} from '../../../fixtures/surrounding_docs';

const TEST_FILTER_COLUMN_NAMES: Array<[string, string]> = [
  [
    'agent',
    'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24',
  ],
  ['extension', 'jpg'],
];

async function addAllFilters(page: ScoutPage) {
  for (const [field, value] of TEST_FILTER_COLUMN_NAMES) {
    await addFilterWithoutStrictCheck(page, field, value);
  }
}

spaceTest.describe(
  'Discover context - back navigation',
  { tag: testData.CONTEXT_DEPLOYMENT_AGNOSTIC_TAGS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_VISUALIZE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.LOGSTASH_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'should go back after loading more in context view',
      async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginAsViewer();
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        await addAllFilters(page);
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const initialHitCount = await pageObjects.discover.getHitCountInt();

        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.contextPage.clickRowAction(1);
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        await pageObjects.contextPage.clickSuccessorLoadMoreButton();
        await pageObjects.contextPage.clickSuccessorLoadMoreButton();
        await pageObjects.contextPage.clickSuccessorLoadMoreButton();

        await page.goBack();
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        const hitCount = await pageObjects.discover.getHitCountInt();
        expect(hitCount).toBe(initialHitCount);
      }
    );

    spaceTest(
      'should go back via breadcrumbs with preserved state',
      async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginAsViewer();
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        await addAllFilters(page);
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.contextPage.clickRowAction(1);
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        await page.testSubj.click('~breadcrumb-deepLinkId-discover');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        for (const [field, value] of TEST_FILTER_COLUMN_NAMES) {
          expect(await pageObjects.filterBar.hasFilter({ field, value, enabled: true })).toBe(true);
        }

        const timeRange = await pageObjects.datePicker.getTimeConfig();
        expect(timeRange.start).toBeTruthy();
        expect(timeRange.end).toBeTruthy();
      }
    );

    spaceTest(
      'should go back via breadcrumbs with preserved state after page refresh',
      async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginAsViewer();
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        await addAllFilters(page);
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.contextPage.clickRowAction(1);
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        await page.reload();
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        await page.testSubj.click('~breadcrumb-deepLinkId-discover');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        for (const [field, value] of TEST_FILTER_COLUMN_NAMES) {
          expect(await pageObjects.filterBar.hasFilter({ field, value, enabled: true })).toBe(true);
        }
      }
    );

    spaceTest(
      'should preserve state when navigating back after URL state changes',
      async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginAsViewer();
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        await addAllFilters(page);
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.contextPage.clickRowAction(1);
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        await spaceTest.step('remove a filter in context view to change URL state', async () => {
          const agentFilter = page.testSubj.locator('~filter & ~filter-key-agent');
          await agentFilter.click();
          await page.testSubj.click('deleteFilter');
          await pageObjects.contextPage.waitUntilContextLoadingHasFinished();
        });

        await spaceTest.step(
          'navigate to discover via breadcrumbs and verify original filters',
          async () => {
            await page.testSubj.click('~breadcrumb-deepLinkId-discover');
            await pageObjects.discover.waitUntilSearchingHasFinished();
            await pageObjects.discover.waitForDocTableRendered();

            for (const [field, value] of TEST_FILTER_COLUMN_NAMES) {
              expect(await pageObjects.filterBar.hasFilter({ field, value, enabled: true })).toBe(
                true
              );
            }
          }
        );

        await spaceTest.step(
          'go back to context and verify modified filter state',
          async () => {
            await page.goBack();
            await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

            const filterBadges = page.testSubj.locator('^filter-badge');
            await expect(filterBadges).toHaveCount(1);
            const [, extensionValue] = TEST_FILTER_COLUMN_NAMES[1];
            expect(
              await pageObjects.filterBar.hasFilter({
                field: 'extension',
                value: extensionValue,
                enabled: false,
              })
            ).toBe(true);
          }
        );

        await spaceTest.step(
          'return to discover and verify original filters are restored',
          async () => {
            await page.testSubj.click('~breadcrumb-deepLinkId-discover');
            await pageObjects.discover.waitUntilSearchingHasFinished();

            for (const [field, value] of TEST_FILTER_COLUMN_NAMES) {
              expect(await pageObjects.filterBar.hasFilter({ field, value, enabled: true })).toBe(
                true
              );
            }
          }
        );
      }
    );
  }
);
