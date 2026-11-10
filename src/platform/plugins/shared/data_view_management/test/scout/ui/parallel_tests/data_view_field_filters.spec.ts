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

spaceTest.describe('Data view field filters', { tag: tags.deploymentAgnostic }, () => {
  let dataViewId: string;

  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    const { data } = await apiServices.dataViews.create({
      title: 'logstash-*',
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });
    dataViewId = data.id;
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
    await apiServices.dataViews.delete(dataViewId, scoutSpace.id);
  });

  spaceTest('creates a field filter and edits it', async ({ pageObjects }) => {
    const { dataViewDetail } = pageObjects;

    await spaceTest.step('create a field filter', async () => {
      await dataViewDetail.goto(dataViewId);
      await dataViewDetail.openSourceFiltersTab();
      await dataViewDetail.addSourceFilter('a');

      await expect.poll(() => dataViewDetail.getSourceFiltersTabCount()).toBe(1);
    });

    await spaceTest.step('edit the field filter', async () => {
      await dataViewDetail.editSourceFilter('a', 'z');
    });

    await spaceTest.step('reload the page and verify the change was saved', async () => {
      await dataViewDetail.goto(dataViewId);
      await dataViewDetail.openSourceFiltersTab();

      await expect(dataViewDetail.sourceFilterRow('z')).toBeVisible();
      await expect(dataViewDetail.sourceFilterRow('a')).toBeHidden();
    });
  });
});
