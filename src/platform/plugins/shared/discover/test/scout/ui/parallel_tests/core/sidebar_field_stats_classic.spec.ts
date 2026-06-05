/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';
import {
  closeFieldStatsPopover,
  fieldStatsBucketRows,
  fieldStatsFooter,
  fieldStatsTitle,
  openFieldStatsPopover,
} from '../../fixtures/common/discover_field_stats';

spaceTest.describe(
  'Discover sidebar field stats in classic mode',
  { tag: tags.stateful.all },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);

      const dataViewId = await apiServices.dataViews.getIdByTitle(
        testData.DEFAULT_DATA_VIEW,
        scoutSpace.id
      );
      const dataView = await apiServices.dataViews.get(dataViewId, scoutSpace.id);

      await apiServices.dataViews.update(dataViewId, {
        spaceId: scoutSpace.id,
        runtimeFieldMap: {
          ...(dataView.data.runtimeFieldMap ?? {}),
          _is_large: {
            type: 'boolean',
            script: {
              source: 'emit(doc["bytes"].value > 1024)',
            },
          },
        },
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.goto({ queryMode: 'classic' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('shows top values for a boolean runtime field', async ({ page }) => {
      await openFieldStatsPopover(page, '_is_large');

      await expect(page.testSubj.locator('dscFieldStats-topValues')).toBeVisible();
      await expect(fieldStatsTitle(page)).toHaveText('Top values');
      await expect(fieldStatsBucketRows(page)).toHaveCount(2);
      await expect(page.testSubj.locator('unifiedFieldStats-buttonGroup')).toBeHidden();
      await expect(page.testSubj.locator('unifiedFieldStats-histogram')).toBeHidden();
      await expect(fieldStatsFooter(page)).toContainText('14,004 records');

      await closeFieldStatsPopover(page);
    });

    spaceTest('shows histogram and top values for a numeric field', async ({ page }) => {
      await openFieldStatsPopover(page, 'bytes');

      await expect(page.testSubj.locator('dscFieldStats-topValues')).toBeVisible();
      await expect(fieldStatsTitle(page)).toContainText('Top values');
      await expect(fieldStatsTitle(page)).toContainText('Distribution');
      await expect(fieldStatsBucketRows(page)).toHaveCount(11);

      await page.testSubj.click('dscFieldStats-buttonGroup-distributionButton');
      await expect(
        page.locator('[data-test-subj="unifiedFieldStats-histogram"] .echChart')
      ).toBeVisible();
      await expect(fieldStatsFooter(page)).toContainText('14,004 records');

      await closeFieldStatsPopover(page);
    });

    spaceTest('shows top values for a keyword field', async ({ page }) => {
      await openFieldStatsPopover(page, 'extension');

      await expect(page.testSubj.locator('dscFieldStats-topValues')).toBeVisible();
      await expect(fieldStatsTitle(page)).toHaveText('Top values');
      await expect(fieldStatsBucketRows(page)).toHaveCount(5);
      await expect(page.testSubj.locator('unifiedFieldStats-buttonGroup')).toBeHidden();
      await expect(page.testSubj.locator('unifiedFieldStats-histogram')).toBeHidden();
      await expect(fieldStatsFooter(page)).toContainText('14,004 records');

      await closeFieldStatsPopover(page);
    });

    spaceTest('shows top values for an IP field', async ({ page }) => {
      await openFieldStatsPopover(page, 'clientip');

      await expect(page.testSubj.locator('dscFieldStats-topValues')).toBeVisible();
      await expect(fieldStatsTitle(page)).toHaveText('Top values');
      await expect(fieldStatsBucketRows(page)).toHaveCount(11);
      await expect(page.testSubj.locator('unifiedFieldStats-buttonGroup')).toBeHidden();
      await expect(page.testSubj.locator('unifiedFieldStats-histogram')).toBeHidden();
      await expect(fieldStatsFooter(page)).toContainText('14,004 records');

      await closeFieldStatsPopover(page);
    });

    spaceTest('shows a time distribution for the timestamp field', async ({ page }) => {
      await openFieldStatsPopover(page, '@timestamp');

      await expect(page.testSubj.locator('unifiedFieldStats-timeDistribution')).toBeVisible();
      await expect(page.testSubj.locator('dscFieldStats-buttonGroup-topValuesButton')).toBeHidden();
      await expect(fieldStatsFooter(page)).toContainText('14,004 records');

      await closeFieldStatsPopover(page);
    });

    spaceTest('shows examples for a geo point field', async ({ page }) => {
      await openFieldStatsPopover(page, 'geo.coordinates');

      await expect(page.testSubj.locator('dscFieldStats-topValues')).toBeVisible();
      await expect(fieldStatsTitle(page)).toHaveText('Examples');
      await expect(fieldStatsBucketRows(page)).toHaveCount(11);
      await expect(page.testSubj.locator('unifiedFieldStats-buttonGroup')).toBeHidden();
      await expect(page.testSubj.locator('unifiedFieldStats-histogram')).toBeHidden();
      await expect(fieldStatsFooter(page)).toContainText('100 sample records');

      await closeFieldStatsPopover(page);
    });
  }
);
