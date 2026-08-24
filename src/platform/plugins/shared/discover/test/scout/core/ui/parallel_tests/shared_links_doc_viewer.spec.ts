/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, type DiscoverPageObjects } from '../../../common/ui/fixtures';

const ESQL_QUERY = 'FROM logstash-* METADATA _id, _index | SORT @timestamp DESC | LIMIT 100';
const EXPANDED_DOC_URL_STATE = 'expandedDoc:';
const TARGET_ROW_INDEX = 0;

const getDecodedUrl = (page: ScoutPage) => decodeURIComponent(page.url());

const expectDocument = async (
  docViewer: DiscoverPageObjects['docViewer'],
  { timestamp, clientIp }: { timestamp: string; clientIp: string }
) => {
  await docViewer.waitForFlyoutOpen();
  await expect(docViewer.getFieldValue('@timestamp')).toHaveText(timestamp);
  await expect(docViewer.getFieldValue('clientip')).toHaveText(clientIp);
};

const queryModes: Array<{
  name: string;
  setup?: (discover: DiscoverPageObjects['discover']) => Promise<void>;
  prepareDocument?: (dataGrid: DiscoverPageObjects['dataGrid']) => Promise<void>;
  getPageState?: (dataGrid: DiscoverPageObjects['dataGrid']) => Promise<{ pageNumber?: string }>;
  expectedPageState?: { pageNumber?: string };
}> = [
  {
    name: 'classic',
    prepareDocument: async (dataGrid) => {
      await dataGrid.getPageButton(1).click();
      await dataGrid.waitForLoad();
    },
    getPageState: async (dataGrid) => ({
      pageNumber: await dataGrid.getCurrentPageNumber(),
    }),
    expectedPageState: { pageNumber: '2' },
  },
  {
    name: 'ES|QL',
    setup: async (discover) => {
      await discover.writeAndSubmitEsqlQuery(ESQL_QUERY);
    },
  },
];

spaceTest.describe('Discover shared links - doc viewer', { tag: '@local-stateful-classic' }, () => {
  spaceTest.use({ viewport: { width: 1600, height: 1200 } });

  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ page, browserAuth, pageObjects }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  for (const { name, setup, prepareDocument, getPageState, expectedPageState } of queryModes) {
    spaceTest(`syncs and restores a shared ${name} document`, async ({ page, pageObjects }) => {
      const { dataGrid, discover, docViewer } = pageObjects;
      const readPageState = getPageState ?? (async () => ({}));
      const pageState = expectedPageState ?? {};

      // Open a document in the configured query mode.
      await setup?.(discover);
      await discover.waitUntilTabIsLoaded();
      await prepareDocument?.(dataGrid);
      await expect.poll(() => readPageState(dataGrid)).toStrictEqual(pageState);
      await docViewer.openAndWaitForFlyout({ rowIndex: TARGET_ROW_INDEX });

      const timestamp = await docViewer.getFieldValue('@timestamp').innerText();
      const clientIp = await docViewer.getFieldValue('clientip').innerText();
      const expectedDocument = { timestamp, clientIp };

      // Opening and closing the flyout synchronizes the document reference with the URL.
      await expect.poll(() => getDecodedUrl(page)).toContain(EXPANDED_DOC_URL_STATE);
      const expandedDocUrl = page.url();

      await docViewer.close();
      await expect.poll(() => getDecodedUrl(page)).not.toContain(EXPANDED_DOC_URL_STATE);
      const closedDocUrl = page.url();

      // Browser history restores the flyout and page in both directions.
      await page.goBack();
      await discover.waitUntilTabIsLoaded();
      await expect(page).toHaveURL(expandedDocUrl);
      await expectDocument(docViewer, expectedDocument);
      await expect.poll(() => readPageState(dataGrid)).toStrictEqual(pageState);

      await page.goForward();
      await discover.waitUntilTabIsLoaded();
      await expect(page).toHaveURL(closedDocUrl);
      await expect(docViewer.getFlyout()).toBeHidden();

      await page.goBack();
      await discover.waitUntilTabIsLoaded();
      await expectDocument(docViewer, expectedDocument);

      // A copied direct link restores the same document and page.
      const sharedUrl = await docViewer.copyDirectLink();

      await page.goto(sharedUrl);
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => getDecodedUrl(page)).toContain(EXPANDED_DOC_URL_STATE);
      await expectDocument(docViewer, expectedDocument);
      await expect.poll(() => readPageState(dataGrid)).toStrictEqual(pageState);

      // Refreshing preserves the expanded document and page.
      await page.reload();
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => getDecodedUrl(page)).toContain(EXPANDED_DOC_URL_STATE);
      await expectDocument(docViewer, expectedDocument);
      await expect.poll(() => readPageState(dataGrid)).toStrictEqual(pageState);
    });
  }
});
