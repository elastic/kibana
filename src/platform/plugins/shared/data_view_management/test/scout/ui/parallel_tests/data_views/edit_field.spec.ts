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
import { navigateToDataViewsManagement } from '../../fixtures/helpers';

test.describe(
  'Data view field format preview',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    let dataViewId: string | undefined;

    test.beforeAll(async ({ esClient, apiServices }) => {
      await esClient.index({
        index: 'data-view-edit-field',
        id: '1',
        document: {
          extension: 'css',
        },
        refresh: true,
      });

      const { data } = await apiServices.dataViews.create({
        title: 'data-view-edit-field',
        timeFieldName: undefined,
      });
      dataViewId = data.id;
    });

    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await navigateToDataViewsManagement(page);
      await page.testSubj.click('detail-link-data-view-edit-field');
    });

    test.afterAll(async ({ esClient, apiServices }) => {
      if (dataViewId) {
        await apiServices.dataViews.delete(dataViewId).catch(() => {});
      }
      await esClient.indices
        .delete({ index: 'data-view-edit-field', ignore_unavailable: true })
        .catch(() => {});
    });

    test('shows indexed fields for data-view-edit-field', async ({ page }) => {
      await page.testSubj.click('tab-indexedFields');
      await expect(page.testSubj.locator('tab-indexedFields')).toBeVisible();
    });
  }
);
