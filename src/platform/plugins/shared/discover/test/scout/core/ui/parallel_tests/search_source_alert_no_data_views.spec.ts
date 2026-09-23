/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';

spaceTest.describe(
  'Discover app - search source alert',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest('should allow creating an alert when there are no data views', async ({ page }) => {
      await page.gotoApp('management/insightsAndAlerting/triggersActions/rules');

      await page.testSubj.click('createFirstRuleButton');
      await page.testSubj.click('.es-query-SelectOption');
      await page.testSubj.click('queryFormType_searchSource');
      await page.testSubj.waitForSelector('selectDataViewExpression');

      const dataViewSelector = page.testSubj.locator('selectDataViewExpression');
      await expect(dataViewSelector).toContainText('data view Select a data view');
    });
  }
);
