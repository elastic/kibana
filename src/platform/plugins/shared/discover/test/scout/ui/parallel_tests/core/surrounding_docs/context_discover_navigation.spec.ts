/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../fixtures/surrounding_docs';

const TEST_COLUMN_NAMES = ['@message'];
const TEST_FILTER_FIELD = 'extension.raw';
const TEST_FILTER_VALUE = 'jpg';

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
      async ({ browserAuth, pageObjects }) => {
        await browserAuth.loginAsViewer();
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        await pageObjects.filterBar.addFilter({
          field: TEST_FILTER_FIELD,
          operator: 'is',
          value: TEST_FILTER_VALUE,
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.contextPage.clickRowAction(1);
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        expect(
          await pageObjects.filterBar.hasFilter({
            field: TEST_FILTER_FIELD,
            value: TEST_FILTER_VALUE,
            enabled: false,
          })
        ).toBe(true);
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

        await page.testSubj.click('~breadcrumb & ~first');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await expect(page.testSubj.locator('dscPage')).toBeVisible({ timeout: 30_000 });
      }
    );

    // TODO: "should navigate to doc view from embeddable" requires dashboard integration
    // which needs updated selectors and is tracked separately.
  }
);
