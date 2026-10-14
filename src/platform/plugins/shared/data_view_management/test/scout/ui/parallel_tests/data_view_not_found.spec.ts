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
import { spaceTest } from '../fixtures';

const MISSING_DATA_VIEW_ID = '111111111111';

spaceTest.describe('Data view not found', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest(
    'redirects to the main view and shows an error when the data view is missing',
    async ({ page, pageObjects }) => {
      await page.gotoApp(`management/kibana/dataViews/patterns/${MISSING_DATA_VIEW_ID}`);

      await expect(page).toHaveURL(/\/app\/management\/kibana\/dataViews\/?(?:[?#].*)?$/);
      // The listing region wraps both the table and the empty prompt, so it renders either way.
      await expect(pageObjects.dataViewsManagement.table).toBeVisible();
      await expect(page.testSubj.locator('globalToastList')).toContainText(
        `The data view with id:${MISSING_DATA_VIEW_ID} could not be loaded. Try creating a new one.`
      );
    }
  );
});
