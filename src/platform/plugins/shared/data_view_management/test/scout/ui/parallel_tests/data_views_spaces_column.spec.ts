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

// The Spaces column only renders when the spaces plugin is available.
spaceTest.describe('Data views list spaces column', { tag: tags.deploymentAgnostic }, () => {
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

  spaceTest('shows the spaces of each data view', async ({ pageObjects, scoutSpace }) => {
    const { dataViewsManagement } = pageObjects;

    await dataViewsManagement.goto();
    await dataViewsManagement.waitForTableLoaded();

    await expect(
      dataViewsManagement.table.getByRole('columnheader', { name: 'Spaces' })
    ).toBeVisible();
    await expect(dataViewsManagement.spaceAvatarInTable(scoutSpace.id)).toBeVisible();
  });
});
