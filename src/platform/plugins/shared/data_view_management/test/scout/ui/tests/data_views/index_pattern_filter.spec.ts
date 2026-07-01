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
import { navigateToDataViewsManagement } from '../../fixtures/helpers';

test.describe(
  'Data view field filters',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    let dataViewId: string | undefined;

    test.beforeAll(async ({ kbnClient, esArchiver, apiServices }) => {
      await kbnClient.savedObjects.cleanStandardList();
      await kbnClient.uiSettings.replace({});
      await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH_FUNCTIONAL);
      const { data } = await apiServices.dataViews.create({ title: 'logstash-*' });
      dataViewId = data.id;
    });

    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await navigateToDataViewsManagement(page);
      await page.testSubj.click('detail-link-logstash-*');
      await page.testSubj.click('tab-indexedFields');
    });

    test.afterAll(async ({ kbnClient, apiServices }) => {
      if (dataViewId) {
        await apiServices.dataViews.delete(dataViewId).catch(() => {});
      }
      await kbnClient.savedObjects.cleanStandardList();
    });

    // Follow-up: field-type filter controls differ from legacy FTR selectors in Scout and
    // need dedicated data views page-object coverage to preserve exact option-by-option parity.

    test('shows indexed fields listing for the selected data view', async ({ page }) => {
      await expect(page.testSubj.locator('tab-indexedFields')).toBeVisible();
      await expect(page.testSubj.locator('field-name-@timestamp')).toBeVisible();
    });

    // Follow-up: conflict-filter flow currently depends on legacy test subject names
    // that are no longer stable in Scout and should be reintroduced via a dedicated PO.
  }
);
