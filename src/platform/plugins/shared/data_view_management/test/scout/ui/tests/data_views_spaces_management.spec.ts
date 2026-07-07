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
import {
  DATA_VIEWS_MANAGEMENT_PATH,
  ES_ARCHIVE_LOGSTASH_FUNCTIONAL,
  SPACES_MANAGEMENT_CUSTOM_SPACE,
} from '../fixtures/constants';

test.describe('Data Views spaces management', { tag: tags.stateful.classic }, () => {
  let dataViewId: string;

  test.beforeAll(async ({ esArchiver, kbnClient, apiServices }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH_FUNCTIONAL);
    await kbnClient.spaces.delete(SPACES_MANAGEMENT_CUSTOM_SPACE.id).catch(() => {});
    await kbnClient.spaces.create(SPACES_MANAGEMENT_CUSTOM_SPACE);
    const { data } = await apiServices.dataViews.create({ title: 'log*' });
    dataViewId = data.id;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ kbnClient, apiServices }) => {
    await apiServices.dataViews.delete(dataViewId).catch(() => {});
    await kbnClient.spaces.delete(SPACES_MANAGEMENT_CUSTOM_SPACE.id).catch(() => {});
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('data view can be assigned to a custom space', async ({ kbnUrl, page, pageObjects }) => {
    await page.goto(kbnUrl.get(DATA_VIEWS_MANAGEMENT_PATH));
    await pageObjects.dataViewsManagement.waitForTableLoaded();

    await test.step('open share-to-space flyout', async () => {
      await pageObjects.dataViewsManagement.openShareToSpaceFlyout('default');
    });

    await test.step('select the custom space and save', async () => {
      await pageObjects.dataViewsManagement.selectSpaceInFlyout(SPACES_MANAGEMENT_CUSTOM_SPACE.id);
      await pageObjects.dataViewsManagement.saveShareToSpaceFlyout();
    });

    await test.step('verify custom space avatar appears in the data view row', async () => {
      await expect(
        pageObjects.dataViewsManagement.spaceAvatarInTable(SPACES_MANAGEMENT_CUSTOM_SPACE.id)
      ).toBeVisible();
    });
  });
});
