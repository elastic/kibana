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
import { KBN_ARCHIVE_DISCOVER } from '../../fixtures/constants';
import { navigateToDataViewsManagement } from '../../fixtures/helpers';

const runtimeFieldName = 'atest';

test.describe(
  'Runtime fields',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.importExport.load(KBN_ARCHIVE_DISCOVER);
    });

    test.beforeEach(async ({ browserAuth, page, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await kbnClient.uiSettings.replace({});
      await navigateToDataViewsManagement(page);
      await page.testSubj.click('detail-link-logstash-*');
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVE_DISCOVER);
    });

    test('opens runtime field editor form', async ({ page }) => {
      await page.testSubj.click('addField');
      await page.testSubj.fill('nameField > input', runtimeFieldName);
      await expect(page.testSubj.locator('typeField')).toBeVisible();
    });
  }
);
