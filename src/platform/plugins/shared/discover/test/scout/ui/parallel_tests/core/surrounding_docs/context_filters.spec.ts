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

const TEST_ANCHOR_FILTER_FIELD = 'geo.src';
const TEST_ANCHOR_FILTER_VALUE = 'IN';
const TEST_COLUMN_NAMES = ['extension', 'geo.src'];

spaceTest.describe(
  'Discover context - filters (basic)',
  { tag: testData.CONTEXT_DEPLOYMENT_AGNOSTIC_TAGS },
  () => {
    let dataViewId: string;

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      const imported = await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_VISUALIZE);
      dataViewId =
        imported.find((so: { title: string }) => so.title === testData.LOGSTASH_DATA_VIEW)?.id ??
        testData.LOGSTASH_DATA_VIEW;
      await scoutSpace.uiSettings.setDefaultIndex(testData.LOGSTASH_DATA_VIEW);
      await scoutSpace.uiSettings.set({ 'discover:rowHeightOption': 0 });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.contextPage.navigateTo(dataViewId, testData.LOGSTASH_ANCHOR_ID, {
        columns: TEST_COLUMN_NAMES,
      });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'discover:rowHeightOption');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'inclusive filter should be addable via expanded data grid rows',
      async ({ page, pageObjects }) => {
        const anchorExpandBtn = page.testSubj.locator('docTableExpandToggleColumnAnchor');
        await anchorExpandBtn.click();

        const flyout = page.testSubj.locator('docViewerFlyout');
        await expect(flyout).toBeVisible({ timeout: 10_000 });

        const searchInput = flyout.locator('[data-test-subj="unifiedDocViewerFieldsSearchInput"]');
        await searchInput.fill(TEST_ANCHOR_FILTER_FIELD);

        const valueCell = flyout.locator(
          `[data-test-subj="tableDocViewRow-${TEST_ANCHOR_FILTER_FIELD}-value"]`
        );
        await expect(valueCell).toBeVisible({ timeout: 10_000 });
        await valueCell.hover();

        const addFilterBtn = page.testSubj.locator(
          `addFilterForValueButton-${TEST_ANCHOR_FILTER_FIELD}`
        );
        await addFilterBtn.click();
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        expect(
          await pageObjects.filterBar.hasFilter({
            field: TEST_ANCHOR_FILTER_FIELD,
            value: TEST_ANCHOR_FILTER_VALUE,
            enabled: true,
          })
        ).toBe(true);
      }
    );

    spaceTest(
      'inclusive filter should be toggleable via the filter bar',
      async ({ page, pageObjects }) => {
        await pageObjects.filterBar.addFilter({
          field: TEST_ANCHOR_FILTER_FIELD,
          operator: 'is',
          value: TEST_ANCHOR_FILTER_VALUE,
        });
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        const filterBadge = page.testSubj.locator(
          `~filter & ~filter-key-${TEST_ANCHOR_FILTER_FIELD}`
        );
        await filterBadge.click();

        const disableButton = page.testSubj.locator('disableFilter');
        if (await disableButton.isVisible()) {
          await disableButton.click();
        }
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        expect(
          await pageObjects.filterBar.hasFilter({
            field: TEST_ANCHOR_FILTER_FIELD,
            value: TEST_ANCHOR_FILTER_VALUE,
            enabled: false,
          })
        ).toBe(true);
      }
    );

    spaceTest(
      'filter for presence should be addable via expanded data grid rows',
      async ({ page, pageObjects }) => {
        const anchorExpandBtn = page.testSubj.locator('docTableExpandToggleColumnAnchor');
        await anchorExpandBtn.click();

        const flyout = page.testSubj.locator('docViewerFlyout');
        await expect(flyout).toBeVisible({ timeout: 10_000 });

        const searchInput = flyout.locator('[data-test-subj="unifiedDocViewerFieldsSearchInput"]');
        await searchInput.fill(TEST_ANCHOR_FILTER_FIELD);

        const nameCell = flyout.locator(
          '[data-gridcell-column-id="name"][data-gridcell-visible-row-index="0"]'
        );
        await expect(nameCell).toBeVisible({ timeout: 10_000 });
        await nameCell.hover();

        const addExistsBtn = page.testSubj.locator(
          `addExistsFilterButton-${TEST_ANCHOR_FILTER_FIELD}`
        );
        await addExistsBtn.click();
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        expect(
          await pageObjects.filterBar.hasFilter({
            field: TEST_ANCHOR_FILTER_FIELD,
            value: 'exists',
            enabled: true,
          })
        ).toBe(true);
      }
    );

    spaceTest(
      'should preserve filters when the page is refreshed',
      async ({ page, pageObjects }) => {
        await pageObjects.filterBar.addFilter({
          field: 'extension',
          operator: 'is',
          value: 'png',
        });
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        expect(
          await pageObjects.filterBar.hasFilter({ field: 'extension', value: 'png', enabled: true })
        ).toBe(true);

        await page.reload();
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        expect(
          await pageObjects.filterBar.hasFilter({ field: 'extension', value: 'png', enabled: true })
        ).toBe(true);
      }
    );

    spaceTest(
      'should update filters when navigating forward and backward in history',
      async ({ page, pageObjects }) => {
        await pageObjects.filterBar.addFilter({
          field: 'extension',
          operator: 'is',
          value: 'png',
        });
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        const filterBadges = page.testSubj.locator('^filter-badge');
        await expect(filterBadges).toHaveCount(1);

        await page.goBack();
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();
        await expect(filterBadges).toHaveCount(0);

        await page.goForward();
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();
        await expect(filterBadges).toHaveCount(1);

        expect(
          await pageObjects.filterBar.hasFilter({ field: 'extension', value: 'png', enabled: true })
        ).toBe(true);
      }
    );
  }
);
