/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { ES_ARCHIVE_LOGSTASH_FUNCTIONAL } from '../../fixtures/constants';
import { createDataViewErrorLocator, navigateToDataViewsManagement } from '../../fixtures/helpers';

test.describe(
  'Data view create/edit/delete',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeAll(async ({ esArchiver, kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH_FUNCTIONAL);
    });

    test.beforeEach(async ({ browserAuth, page, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await kbnClient.uiSettings.replace({});
      await navigateToDataViewsManagement(page);
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('opens and closes create editor without saving', async ({ page }) => {
      await page.testSubj.click('createDataViewButton');
      await expect(page.testSubj.locator('indexPatternEditorFlyout')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.testSubj.locator('createDataViewButton')).toBeVisible();
    });

    test('shows validation errors and allows fixing before save', async ({ page, pageObjects }) => {
      await pageObjects.dataViewsManagement.openCreateWizard();
      await page.testSubj.fill('createIndexPatternTitleInput', 'log-fake*');
      await page.testSubj.click('saveIndexPatternButton');
      await expect(createDataViewErrorLocator(page)).toContainText('doesn');

      await page.testSubj.fill('createIndexPatternTitleInput', 'logstash-*');
      await expect(page.testSubj.locator('createIndexPatternTitleInput')).toHaveValue('logstash-*');
    });

    test('validates timestamp options when index pattern changes', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.dataViewsManagement.openCreateWizard();
      await page.testSubj.fill('createIndexPatternTitleInput', 'log*');
      await expect(page.testSubj.locator('timestampField')).toBeVisible();
      await page.testSubj.fill('createIndexPatternTitleInput', 'kibana*');
      await page.testSubj.click('saveIndexPatternButton');
      await expect(createDataViewErrorLocator(page)).toContainText('doesn');
    });

    test('handles special characters in template input', async ({ page, pageObjects }) => {
      await pageObjects.dataViewsManagement.openCreateWizard();
      await page.testSubj.fill('createIndexPatternTitleInput', 'heart');
      await page.testSubj.fill('createIndexPatternTitleInput', '❤️');
      await expect(createDataViewErrorLocator(page)).toContainText('doesn');
    });

    test('creates logstash data view and edits its title', async ({ page, pageObjects }) => {
      await page.testSubj.click('createDataViewButton');
      await page.testSubj.fill('createIndexPatternTitleInput', 'logstash-*');
      await page.testSubj.click('saveIndexPatternButton');

      await expect(page.testSubj.locator('indexPatternTitle')).toContainText('logstash-*');
      expect(page.url()).toContain('/management/kibana/dataViews/');

      await pageObjects.dataViewsManagement.editDataView({ name: 'Logstash Star' });
      await expect(page.testSubj.locator('indexPatternTitle')).toContainText('Logstash Star');
    });

    // The legacy "field-list swap" and "save disabled while the confirm modal is open" cases
    // are covered in data_view_edit.spec.ts.
  }
);
