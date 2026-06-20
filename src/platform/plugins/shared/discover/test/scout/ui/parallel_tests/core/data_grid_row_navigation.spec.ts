/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '@kbn/scout';

const TIME_RANGE = {
  from: '2015-09-21T09:00:00.000Z',
  to: '2015-09-21T10:00:00.000Z',
};

const getIndexNames = (spaceId: string) => ({
  dataViewTitle: `similar_index*_${spaceId}`,
  firstIndex: `similar_index_${spaceId}`,
  secondIndex: `similar_index_two_${spaceId}`,
});

const getRowNavigationViewerRole = (indexPattern: string): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: [indexPattern],
        privileges: ['read', 'view_index_metadata'],
      },
    ],
  },
  kibana: [{ base: ['read'], feature: {}, spaces: ['*'] }],
});

spaceTest.describe('Discover data grid row navigation', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace, apiServices, esClient }) => {
    const { dataViewTitle, firstIndex, secondIndex } = getIndexNames(scoutSpace.id);

    await esClient.indices.delete({
      index: [firstIndex, secondIndex],
      ignore_unavailable: true,
    });

    await esClient.index({
      index: firstIndex,
      id: '1',
      document: {
        username: 'Dmitry',
        '@timestamp': '2015-09-21T09:30:23.000Z',
        message: 'hello',
      },
      refresh: true,
    });

    await esClient.index({
      index: secondIndex,
      id: '1',
      document: {
        username: 'Dmitry',
        '@timestamp': '2015-09-21T09:30:23.000Z',
        message: 'hello',
      },
      refresh: true,
    });

    const { data: dataView } = await apiServices.dataViews.create({
      title: dataViewTitle,
      name: dataViewTitle,
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });

    await scoutSpace.uiSettings.set({
      defaultIndex: dataView.id,
    });
    await scoutSpace.uiSettings.setDefaultTime(TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ page, browserAuth, pageObjects, scoutSpace }) => {
    const { dataViewTitle } = getIndexNames(scoutSpace.id);

    await page.setViewportSize({ width: 1600, height: 1200 });
    await browserAuth.loginWithCustomRole(getRowNavigationViewerRole(dataViewTitle));
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ scoutSpace, esClient }) => {
    const { firstIndex, secondIndex } = getIndexNames(scoutSpace.id);

    await esClient.indices.delete({
      index: [firstIndex, secondIndex],
      ignore_unavailable: true,
    });
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'navigates through rows with the same document id but different indices',
    async ({ pageObjects, scoutSpace }) => {
      const { firstIndex, secondIndex } = getIndexNames(scoutSpace.id);
      const { discover } = pageObjects;

      await spaceTest.step('open the first row in the document viewer', async () => {
        await discover.openAndWaitForDocViewerFlyout({ rowIndex: 0 });
        await expect.poll(() => discover.getDocViewerFieldValue('_index')).toBe(firstIndex);
      });

      await spaceTest.step('navigate to the next row in the document viewer', async () => {
        await discover.goToNextDocViewerDocument();
        await expect.poll(() => discover.getDocViewerFieldValue('_index')).toBe(secondIndex);
      });
    }
  );
});
