/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe('Date range picker presets persistence', { tag: testData.SQM_UI_TAG }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.SAVED_QUERY_BUNDLE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(testData.DISCOVER_ALL_SQM_ALL_ROLE);
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.selectDataView('logstash-*');
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('persists save and delete across reloads', async ({ page, pageObjects }) => {
    const presetValue = 'last 123 days';
    const presetLabel = 'Last 123 days';
    const { datePicker, discover } = pageObjects;

    await spaceTest.step('save a date range preset', async () => {
      await datePicker.setTextRange(presetValue);
      await datePicker.saveCurrentRangeAsPreset();
      await datePicker.openDateRangePickerPresetsPanel();
      await expect(datePicker.getDateRangePreset(presetLabel)).toBeVisible();
    });

    await spaceTest.step('reload and verify the preset remains available', async () => {
      await page.reload();
      await discover.waitUntilSearchingHasFinished();
      await datePicker.openDateRangePickerPresetsPanel();
      await expect(datePicker.getDateRangePreset(presetLabel)).toBeVisible();
      await datePicker.closeDateRangePickerPresetsPanel();
    });

    await spaceTest.step('delete the date range preset', async () => {
      await datePicker.deleteDateRangePreset(presetLabel);
      await expect(datePicker.getDateRangePreset(presetLabel)).toBeHidden();
    });

    await spaceTest.step('reload and verify the preset remains deleted', async () => {
      await page.reload();
      await discover.waitUntilSearchingHasFinished();
      await datePicker.openDateRangePickerPresetsPanel();
      await expect(datePicker.getDateRangePreset(presetLabel)).toBeHidden();
    });
  });

  spaceTest('does not offer deletion of quick ranges', async ({ page, pageObjects }) => {
    const quickRangeLabel = 'Last 15 minutes';
    const { datePicker, discover } = pageObjects;

    await spaceTest.step('a quick range has no delete action', async () => {
      await datePicker.openDateRangePickerPresetsPanel();
      const quickRange = datePicker.getDateRangePreset(quickRangeLabel);
      await expect(quickRange).toBeVisible();
      await quickRange.hover();
      await expect(datePicker.getDateRangePresetDeleteButton(quickRangeLabel)).toBeHidden();
      await datePicker.closeDateRangePickerPresetsPanel();
    });

    await spaceTest.step('saving a preset leaves the quick range locked', async () => {
      await datePicker.setTextRange('last 123 days');
      await datePicker.saveCurrentRangeAsPreset();
      await datePicker.openDateRangePickerPresetsPanel();
      await expect(datePicker.getDateRangePresetDeleteButton('Last 123 days')).toBeAttached();
      await expect(datePicker.getDateRangePresetDeleteButton(quickRangeLabel)).toBeHidden();
      await datePicker.closeDateRangePickerPresetsPanel();
    });

    await spaceTest.step('reload and verify the quick range is still there', async () => {
      await page.reload();
      await discover.waitUntilSearchingHasFinished();
      await datePicker.openDateRangePickerPresetsPanel();
      await expect(datePicker.getDateRangePreset(quickRangeLabel)).toBeVisible();
      await expect(datePicker.getDateRangePresetDeleteButton(quickRangeLabel)).toBeHidden();
    });
  });
});
