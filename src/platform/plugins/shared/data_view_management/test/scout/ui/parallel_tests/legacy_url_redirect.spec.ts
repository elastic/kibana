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

// Back-compat for bookmarked URLs from before index patterns were renamed to data views.
spaceTest.describe('Data views legacy URL redirects', { tag: tags.deploymentAgnostic }, () => {
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

  spaceTest(
    'redirects the legacy listing URL to data views management',
    async ({ page, pageObjects }) => {
      await page.gotoApp('management/kibana/indexPatterns');

      await expect(page).toHaveURL(/\/app\/management\/kibana\/dataViews\/?(?:[?#].*)?$/);
      await expect(pageObjects.dataViewsManagement.table).toBeVisible();
    }
  );

  spaceTest(
    'redirects a legacy data view URL to the data view page',
    async ({ page, pageObjects }) => {
      await page.gotoApp(`management/kibana/indexPatterns/patterns/${dataViewId}`);

      await expect(page).toHaveURL(
        new RegExp(`/app/management/kibana/dataViews/dataView/${dataViewId}(?:[?#].*)?$`)
      );
      await expect(pageObjects.dataViewDetail.container).toBeVisible();
    }
  );
});
