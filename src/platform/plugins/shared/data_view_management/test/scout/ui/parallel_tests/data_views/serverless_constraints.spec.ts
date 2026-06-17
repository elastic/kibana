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
import { DataViewType } from '@kbn/data-views-plugin/common';
import { navigateToDataViewsManagement } from '../../fixtures/helpers';

test.describe(
  'Data views serverless constraints',
  {
    tag: [
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    const createdDataViewIds: string[] = [];

    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await navigateToDataViewsManagement(page);
    });

    test.afterAll(async ({ apiServices, kbnClient }) => {
      await Promise.all(
        createdDataViewIds.map((id) => apiServices.dataViews.delete(id).catch(() => {}))
      );
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('hides scripted fields tab in data view details', async ({ apiServices, page }) => {
      const { data } = await apiServices.dataViews.create({ title: 'basic_index' });
      createdDataViewIds.push(data.id);

      await page.testSubj.click('detail-link-basic_index');
      await expect(page.testSubj.locator('tab-indexedFields')).toBeVisible();
      await expect(page.testSubj.locator('tab-scriptedFields')).toBeHidden();
    });

    test('hides rollup tags in listing and details', async ({ apiServices, page }) => {
      const { data } = await apiServices.dataViews.create({
        title: 'basic_index',
        type: DataViewType.ROLLUP,
      });
      createdDataViewIds.push(data.id);

      await expect(page.testSubj.locator('rollup-tag')).toBeHidden();
      await page.testSubj.click('detail-link-basic_index');
      await expect(page.testSubj.locator('rollup-tag')).toBeHidden();
    });

    test('shows spaces column in listing', async ({ apiServices, page }) => {
      const { data } = await apiServices.dataViews.create({ title: 'basic_index' });
      createdDataViewIds.push(data.id);

      await expect(page.testSubj.locator('tableHeaderCell_namespaces_1')).toBeVisible();
    });
  }
);
