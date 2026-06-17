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
  'Data view exclusion patterns',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    let dataViewId: string | undefined;

    test.beforeAll(async ({ esClient, apiServices }) => {
      await esClient.index({
        index: 'index-a',
        document: { user: 'matt' },
        refresh: true,
      });
      await esClient.index({
        index: 'index-b',
        document: { title: 'hello' },
        refresh: true,
      });

      const { data } = await apiServices.dataViews.create({ title: 'index-*,-index-b' });
      dataViewId = data.id;
    });

    test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await navigateToDataViewsManagement(page);
      await pageObjects.dataViewsManagement.waitForTableLoaded();
    });

    test.afterAll(async ({ esClient, apiServices }) => {
      if (dataViewId) {
        await apiServices.dataViews.delete(dataViewId).catch(() => {});
      }
      await esClient.indices.delete({ index: 'index-a', ignore_unavailable: true }).catch(() => {});
      await esClient.indices.delete({ index: 'index-b', ignore_unavailable: true }).catch(() => {});
    });

    test('creates a data view that excludes index-b fields', async ({ pageObjects }) => {
      await pageObjects.dataViewsManagement.openDataViewDetails('index-*,-index-b');

      await expect(pageObjects.dataViewsManagement.fieldsTabCountLocator()).toContainText('7');
    });
  }
);
