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
import { spaceTest, testData } from '../../../fixtures/surrounding_docs';

const TEST_COLUMN_NAMES = ['@message'];
const TEST_FILTER_COLUMN_NAMES: Array<[string, string]> = [
  ['extension.raw', 'jpg'],
  ['geo.src', 'IN'],
];

async function addFilterWithoutStrictCheck(page: ScoutPage, field: string, value: string) {
  await page.testSubj.click('addFilter');
  await page.testSubj.waitForSelector('addFilterPopover');
  await page.testSubj.typeWithDelay('filterFieldSuggestionList > comboBoxSearchInput', field);
  await page.click(`.euiComboBoxOption[title="${field}"]`);
  await expect(page.testSubj.locator('filterOperatorList')).not.toHaveClass(
    /euiComboBox-isDisabled/
  );
  await page.testSubj.typeWithDelay('filterOperatorList > comboBoxSearchInput', 'is');
  await page.click('.euiComboBoxOption[title="is"]');
  const filterParamsInput = page.locator('[data-test-subj="filterParams"] input');
  await expect(filterParamsInput).toBeEditable();
  await filterParamsInput.focus();
  await page.typeWithDelay('[data-test-subj="filterParams"] input', value);
  await page.testSubj.click('saveFilter');
  await expect(page.testSubj.locator('addFilterPopover')).toBeHidden();
}

async function addAllFilters(page: ScoutPage) {
  for (const [field, value] of TEST_FILTER_COLUMN_NAMES) {
    await addFilterWithoutStrictCheck(page, field, value);
  }
}

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
      async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginAsViewer();
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

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
      'should open context view with selected document as anchor',
      async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginAsViewer();
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        const firstRowText = await page
          .locator('[data-grid-visible-row-index="0"] [data-gridcell-column-index="0"]')
          .innerText();
        const firstTimestamp = firstRowText.split('\t')[0] || firstRowText.split('\n')[0];

        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.contextPage.clickRowAction(1);
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        const anchorExpandButton = page.testSubj.locator('docTableExpandToggleColumnAnchor');
        await expect(anchorExpandButton).toBeVisible();
        const anchorRow = anchorExpandButton.locator('xpath=ancestor::*[@data-grid-row-index]');
        const anchorText = await anchorRow.innerText();
        expect(anchorText).toContain(firstTimestamp.trim());
      }
    );

    spaceTest(
      'should open context view with filters disabled',
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

        for (const [field, value] of TEST_FILTER_COLUMN_NAMES) {
          expect(await pageObjects.filterBar.hasFilter({ field, value, enabled: false })).toBe(
            true
          );
        }
      }
    );

    spaceTest(
      'should navigate to doc view and back to discover',
      async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginAsViewer();
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.contextPage.clickRowAction(1);
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        await pageObjects.contextPage.openRowActions(0);
        await pageObjects.contextPage.clickRowAction(0);

        await expect(page.testSubj.locator('doc-hit')).toBeVisible({ timeout: 30_000 });

        await page.testSubj.click('~breadcrumb-deepLinkId-discover');
        await pageObjects.discover.waitUntilSearchingHasFinished();
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
        await pageObjects.discover.saveSearch('my search');

        await pageObjects.dashboard.openNewDashboard();
        await pageObjects.dashboard.addSavedSearch('my-search');
        await pageObjects.dashboard.waitForRenderComplete();

        const rowToggle = page.locator(
          '[data-grid-visible-row-index="0"] [data-test-subj="docTableExpandToggleColumn"]'
        );
        await rowToggle.click();

        const flyout = page.testSubj.locator('docViewerFlyout');
        await expect(flyout).toBeVisible({ timeout: 10_000 });
        const viewDocAction = flyout.locator('[data-test-subj="docTableRowAction"] >> nth=0');
        await viewDocAction.click();

        const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
        if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        await expect(page).toHaveURL(/#\/doc/, { timeout: 30_000 });
        await expect(page.testSubj.locator('doc-hit')).toBeVisible({ timeout: 30_000 });
      }
    );
  }
);
