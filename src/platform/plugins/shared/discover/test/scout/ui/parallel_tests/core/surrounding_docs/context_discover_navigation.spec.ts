/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  testData,
  addFilters,
  loginAndGoToDiscover,
  navigateToFirstDocContext,
} from '../../../fixtures/surrounding_docs';

const TEST_COLUMN_NAMES = ['@message'];
const TEST_FILTER_COLUMN_NAMES: Array<[string, string]> = [
  ['extension.raw', 'jpg'],
  ['geo.src', 'IN'],
];

spaceTest.describe(
  'Discover context - navigation from Discover',
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
      'should open context view with the same columns',
      async ({ page, pageObjects, browserAuth }) => {
        await loginAndGoToDiscover({ browserAuth, pageObjects });
        for (const columnName of TEST_COLUMN_NAMES) {
          await page.testSubj.fill('fieldListFiltersFieldSearch', columnName);
          await page.testSubj.click(`fieldToggle-${columnName}`);
        }
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const headerColumns = await pageObjects.discover.getDocHeader();
        expect(headerColumns).toContain('@timestamp');
        for (const col of TEST_COLUMN_NAMES) {
          expect(headerColumns).toContain(col);
        }
      }
    );

    spaceTest(
      'should open context view with selected document as anchor and allow selecting next anchor',
      async ({ page, pageObjects, browserAuth }) => {
        await loginAndGoToDiscover({ browserAuth, pageObjects });
        const firstRowText = await page
          .locator('[data-grid-visible-row-index="0"] [data-gridcell-column-index="0"]')
          .innerText();
        const firstTimestamp = firstRowText.split('\t')[0] || firstRowText.split('\n')[0];

        await spaceTest.step('verify initial anchor matches selected document', async () => {
          await navigateToFirstDocContext(pageObjects);

          const anchorExpandButton = page.testSubj.locator('docTableExpandToggleColumnAnchor');
          await expect(anchorExpandButton).toBeVisible();
          const anchorRow = anchorExpandButton.locator('xpath=ancestor::*[@data-grid-row-index]');
          const anchorText = await anchorRow.innerText();
          expect(anchorText).toContain(firstTimestamp.trim());
        });

        await spaceTest.step('select next anchor from context view', async () => {
          const contextRows = await pageObjects.contextPage.getRowsText(false);
          const timestampRegex = /\w{3}\s+\d{1,2},\s+\d{4}\s+@\s+[\d:.]+/;
          const match = contextRows[0]?.match(timestampRegex);
          const firstContextTimestamp = match ? match[0] : '';
          expect(firstContextTimestamp).toBeTruthy();

          await pageObjects.contextPage.openRowActions(0);
          await pageObjects.contextPage.clickRowAction(1);
          await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

          const anchorExpandButton = page.testSubj.locator('docTableExpandToggleColumnAnchor');
          await expect(anchorExpandButton).toBeVisible();
          const anchorRow = anchorExpandButton.locator('xpath=ancestor::*[@data-grid-row-index]');
          const anchorText = await anchorRow.innerText();
          expect(anchorText).toContain(firstContextTimestamp);
        });
      }
    );

    spaceTest(
      'should open context view with filters disabled',
      async ({ page, pageObjects, browserAuth }) => {
        await loginAndGoToDiscover({ browserAuth, pageObjects });
        await addFilters(page, TEST_FILTER_COLUMN_NAMES);
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await navigateToFirstDocContext(pageObjects);

        for (const [field, value] of TEST_FILTER_COLUMN_NAMES) {
          expect(await pageObjects.filterBar.hasFilter({ field, value, enabled: false })).toBe(
            true
          );
        }
      }
    );

    spaceTest(
      'should navigate to doc view and back to discover',
      async ({ page, pageObjects, browserAuth }) => {
        await loginAndGoToDiscover({ browserAuth, pageObjects });
        await navigateToFirstDocContext(pageObjects);

        await pageObjects.contextPage.openRowActions(0);
        await pageObjects.contextPage.clickRowAction(0);

        // doc view load can be slow with large logstash dataset
        await expect(page.testSubj.locator('doc-hit')).toBeVisible({ timeout: 30_000 });

        await page.testSubj.click('~breadcrumb-deepLinkId-discover');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        // full Discover re-render after breadcrumb navigation
        await expect(page.testSubj.locator('dscPage')).toBeVisible({ timeout: 30_000 });
      }
    );

    spaceTest(
      'should navigate to doc view from embeddable',
      async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();
        const savedSearchName = 'my search';
        await pageObjects.discover.saveSearch(savedSearchName);

        await pageObjects.dashboard.openNewDashboard();
        await pageObjects.dashboard.addSavedSearch(savedSearchName);
        await pageObjects.dashboard.waitForRenderComplete();

        const rowToggle = page.locator(
          '[data-grid-visible-row-index="0"] [data-test-subj="docTableExpandToggleColumn"]'
        );
        await rowToggle.click();

        const flyout = page.testSubj.locator('docViewerFlyout');
        // flyout renders after row expansion + data fetch
        await expect(flyout).toBeVisible({ timeout: 10_000 });
        const viewDocAction = flyout.locator('[data-test-subj="docTableRowAction"] >> nth=0');
        await viewDocAction.click();

        // dashboard may prompt "unsaved changes" confirmation on navigation
        const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
        if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        // doc view load can be slow with large logstash dataset
        await expect(page).toHaveURL(/#\/doc/, { timeout: 30_000 });
        await expect(page.testSubj.locator('doc-hit')).toBeVisible({ timeout: 30_000 });
      }
    );
  }
);
