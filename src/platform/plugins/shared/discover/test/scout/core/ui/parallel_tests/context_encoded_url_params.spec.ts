/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const INDEX_NAME = 'context_encoded_param';
const DATA_VIEW_ID = 'context-enc:oded-param';
const DOC_ID = '1+1=2/&?#';

spaceTest.describe(
  'Discover — encoded URL params in context page',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ esClient, apiServices, discoverScoutSpace }) => {
      await esClient.bulk({
        operations: [
          { index: { _index: INDEX_NAME, _id: DOC_ID } },
          { '@timestamp': '2015-09-21T09:30:23', name: 'Dmitry' },
        ],
      });
      await apiServices.dataViews.create({
        id: DATA_VIEW_ID,
        title: INDEX_NAME,
        timeFieldName: '@timestamp',
        override: true,
        spaceId: discoverScoutSpace.id,
      });
      await discoverScoutSpace.uiSettings.setDefaultTime({
        from: '2015-09-18T06:00:00.000Z',
        to: '2015-09-23T18:00:00.000Z',
      });
    });

    spaceTest.afterAll(async ({ esClient, discoverScoutSpace }) => {
      await esClient.indices.delete({ index: INDEX_NAME, ignore_unavailable: true });
      await discoverScoutSpace.uiSettings.unset('timepicker:timeDefaults');
    });

    spaceTest(
      'navigates correctly to surrounding documents with encoded data view and doc IDs',
      async ({ browserAuth, page, pageObjects }) => {
        const { dataGrid, discover } = pageObjects;

        await browserAuth.loginAsPrivilegedUser();
        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(INDEX_NAME);
        await discover.waitUntilSearchingHasFinished();
        await dataGrid.waitForDocTableRendered();

        await dataGrid.openDocumentDetails({ rowIndex: 0 });
        const flyout = page.testSubj.locator('docViewerFlyout');
        await expect(flyout).toBeVisible();
        await flyout.getByRole('link', { name: 'View surrounding documents' }).click();

        await expect(page.testSubj.locator('appHeaderTitle')).toHaveText(
          `Documents surrounding #${DOC_ID}`
        );
      }
    );
  }
);
