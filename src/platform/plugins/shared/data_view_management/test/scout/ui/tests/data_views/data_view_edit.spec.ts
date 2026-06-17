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

test.describe(
  'Data view editing an existing data view',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    // These tests run in declaration order against a single shared data view (the standard
    // Scout config runs workers: 1, fullyParallel: false), so the delete test must stay last.
    let dataViewId: string;

    test.beforeAll(async ({ apiServices, esArchiver, kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH_FUNCTIONAL);
      const { data } = await apiServices.dataViews.create({ title: 'logstash-*' });
      dataViewId = data.id;
    });

    test.beforeEach(async ({ browserAuth, kbnClient, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await kbnClient.uiSettings.replace({});
      await pageObjects.dataViewsManagement.gotoDataViewById(dataViewId);
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('shows the expected fields table headers', async ({ page, pageObjects }) => {
      const { dataViewsManagement } = pageObjects;
      await expect(dataViewsManagement.fieldsTableHeader('displayName', 0)).toBeVisible();
      await expect(dataViewsManagement.fieldsTableHeader('type', 1)).toBeVisible();
      await expect(dataViewsManagement.fieldsTableHeader('format', 2)).toBeVisible();
      await expect(dataViewsManagement.fieldsTableHeader('searchable', 3)).toBeVisible();
      await expect(dataViewsManagement.fieldsTableHeader('aggregatable', 4)).toBeVisible();
      await expect(dataViewsManagement.fieldsTableHeader('excluded', 5)).toBeVisible();
      // Name, Type, Format, Searchable, Aggregatable, Excluded, Actions
      await expect(page.locator('table.euiTable thead tr th')).toHaveCount(7);
    });

    test('edits the display name', async ({ page, pageObjects }) => {
      await pageObjects.dataViewsManagement.editDataView({ name: 'Logstash Star' });
      await expect(page.testSubj.locator('indexPatternTitle')).toContainText('Logstash Star');
    });

    test('saves with the same name when the pattern changes', async ({ page, pageObjects }) => {
      const { confirmed } = await pageObjects.dataViewsManagement.editDataView({
        title: 'logstash-*,hello_world*',
      });
      expect(confirmed).toBe(true);
      await expect(page.testSubj.locator('indexPatternTitle')).toContainText('Logstash Star');
    });

    test('shows the edit confirm modal and updates the title', async ({ page, pageObjects }) => {
      const { confirmed } = await pageObjects.dataViewsManagement.editDataView({
        name: 'Index Star',
        title: 'logstash-2*',
      });
      expect(confirmed).toBe(true);
      await expect(page.testSubj.locator('indexPatternTitle')).toContainText('Index Star');
    });

    test('prefills the editor with previously saved values', async ({ page, pageObjects }) => {
      await pageObjects.dataViewsManagement.editDataView({ name: 'Logs UTC', title: 'logstash-*' });

      // Reopening the editor should restore the previously saved name and index pattern.
      await pageObjects.dataViewsManagement.openEditor();
      await expect(page.testSubj.locator('createIndexPatternNameInput')).toHaveValue('Logs UTC');
      await expect(page.testSubj.locator('createIndexPatternTitleInput')).toHaveValue('logstash-*');
      await page.keyboard.press('Escape');
    });

    test('returns to the listing after deletion', async ({ page, pageObjects }) => {
      await pageObjects.dataViewsManagement.deleteDataView();
      await page.waitForURL(/\/app\/management\/kibana\/dataViews$/);
      await expect(pageObjects.dataViewsManagement.createButton).toBeVisible();
    });
  }
);
