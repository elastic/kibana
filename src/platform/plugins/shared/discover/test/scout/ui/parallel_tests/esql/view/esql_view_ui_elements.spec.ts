/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL view in Discover: which top-nav/grid/sidebar UI elements are present
 * in classic mode vs ES|QL mode.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { spaceTest } from '../../../fixtures';
import { testData } from '../../../fixtures/common';

spaceTest.describe('Discover ES|QL view - UI elements', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    // Admin login: the classic-mode step asserts the field "Edit" action
    // (`discoverFieldListPanelEdit-*`), which requires data-view edit
    // permissions that the serverless privileged (editor) role lacks.
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'shows different top-nav and grid controls in classic vs ES|QL mode',
    async ({ page, pageObjects }) => {
      const { discover, datePicker, unifiedFieldList } = pageObjects;

      await spaceTest.step(
        'classic mode shows the classic search bar and doc-table controls',
        async () => {
          await expect(page.testSubj.locator('showQueryBarMenu')).toBeVisible();
          expect(await datePicker.timePickerExists()).toBe(true);
          await expect(page.testSubj.locator('addFilter')).toBeVisible();
          await expect(page.testSubj.locator('dscViewModeDocumentButton')).toBeVisible();
          await expect(page.testSubj.locator('unifiedHistogramChart')).toBeVisible();
          await expect(page.testSubj.locator('discoverQueryHits')).toBeVisible();
          // Share renders as a direct app-menu item; Alerts lives in the
          // overflow ("more") popover.
          await expect(page.testSubj.locator('shareTopNavButton')).toBeVisible();
          await page.testSubj.click('app-menu-overflow-button');
          await expect(page.testSubj.locator('discoverAlertsButton')).toBeVisible();
          await page.testSubj.click('app-menu-overflow-button');
          await expect(page.testSubj.locator('app-menu-popover')).toBeHidden();
          await expect(page.testSubj.locator('docTableExpandToggleColumn')).not.toHaveCount(0);
          await expect(page.testSubj.locator('dataGridColumnSortingButton')).toBeVisible();
          await expect(page.testSubj.locator('fieldListFiltersFieldSearch')).toBeVisible();
          await expect(
            page.testSubj.locator('fieldListFiltersFieldTypeFilterToggle')
          ).toBeVisible();

          await unifiedFieldList.clickFieldListItem('@message');
          await expect(page.testSubj.locator('discoverFieldListPanelEdit-@message')).toBeVisible();
        }
      );

      await spaceTest.step(
        'ES|QL mode replaces the search bar and hides classic-only controls',
        async () => {
          await discover.selectTextBaseLang();
          await discover.waitUntilTabIsLoaded();

          await expect(page.testSubj.locator('fieldListFiltersFieldSearch')).toBeVisible();
          await expect(page.testSubj.locator('ESQLEditor')).toBeVisible();
          expect(await datePicker.timePickerExists()).toBe(true);

          await expect(page.testSubj.locator('showQueryBarMenu')).toBeHidden();
          await expect(page.testSubj.locator('addFilter')).toBeHidden();
          await expect(page.testSubj.locator('dscViewModeDocumentButton')).toBeHidden();
          // When Lens suggests a table, an ES|QL-based histogram is still rendered.
          await expect(page.testSubj.locator('unifiedHistogramChart')).toBeVisible();
          await expect(page.testSubj.locator('discoverQueryHits')).toBeVisible();
          // Share and Alerts stay available in ES|QL mode too.
          await expect(page.testSubj.locator('shareTopNavButton')).toBeVisible();
          await page.testSubj.click('app-menu-overflow-button');
          await expect(page.testSubj.locator('discoverAlertsButton')).toBeVisible();
          await page.testSubj.click('app-menu-overflow-button');
          await expect(page.testSubj.locator('app-menu-popover')).toBeHidden();
          // No document sorting for the Document view.
          await expect(page.testSubj.locator('dataGridColumnSortingButton')).toBeHidden();
          await expect(page.testSubj.locator('docTableExpandToggleColumn')).not.toHaveCount(0);
          await expect(
            page.testSubj.locator('fieldListFiltersFieldTypeFilterToggle')
          ).toBeVisible();

          await unifiedFieldList.clickFieldListItem('@message');
          await expect(page.testSubj.locator('discoverFieldListPanelEditItem')).toBeHidden();
        }
      );
    }
  );
});
