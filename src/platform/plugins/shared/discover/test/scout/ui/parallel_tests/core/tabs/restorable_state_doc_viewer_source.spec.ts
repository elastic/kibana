/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';

const DOC_VIEWER_SOURCE_TAB_ID = 'doc_view_source';
const DOC_VIEWER_TABLE_TAB_ID = 'doc_view_table';
const ESE_SEARCH_ENDPOINT = '/internal/search/ese';

const countMatchingRequests = async (
  page: ScoutPage,
  endpoint: string,
  action: () => Promise<void>
): Promise<number> => {
  let count = 0;
  const listener = (request: { url: () => string }) => {
    if (request.url().includes(endpoint)) {
      count++;
    }
  };

  page.on('request', listener);
  try {
    await action();
  } finally {
    page.off('request', listener);
  }

  return count;
};

const openSourceDocViewer = async ({ dataGrid, discover }: PageObjects, rowIndex: number) => {
  await dataGrid.openAndWaitForDocViewerFlyout({ rowIndex });
  expect(await discover.isShowingDocViewer()).toBe(true);
  await dataGrid.openDocViewerTab(DOC_VIEWER_SOURCE_TAB_ID);
  await dataGrid.readJsonFromCodeEditor();
};

const openTableDocViewer = async ({ dataGrid, discover }: PageObjects, rowIndex: number) => {
  await dataGrid.openAndWaitForDocViewerFlyout({ rowIndex });
  expect(await discover.isShowingDocViewer()).toBe(true);
  await dataGrid.openDocViewerTab(DOC_VIEWER_TABLE_TAB_ID);
  await dataGrid.getDocViewerTab(DOC_VIEWER_TABLE_TAB_ID).waitFor({ state: 'visible' });
};

spaceTest.describe(
  'Discover tabs - restorable DocViewer source state',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest('restores ES query hide-null-values state per tab', async ({ page, pageObjects }) => {
      const { dataGrid, discover, unifiedTabs } = pageObjects;

      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();
      await openTableDocViewer(pageObjects, 0);

      const hideNullValuesSwitch = page.testSubj.locator('unifiedDocViewerHideNullValuesSwitch');
      await expect(hideNullValuesSwitch).toHaveAttribute('aria-checked', 'false');

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await openTableDocViewer(pageObjects, 0);
      await expect(hideNullValuesSwitch).toHaveAttribute('aria-checked', 'false');
      await hideNullValuesSwitch.click();
      await expect(hideNullValuesSwitch).toHaveAttribute('aria-checked', 'true');

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await dataGrid.getDocViewer().waitFor({ state: 'visible' });
      await expect(hideNullValuesSwitch).toHaveAttribute('aria-checked', 'false');
    });

    spaceTest('restores JSON source content without refetching', async ({ page, pageObjects }) => {
      const { dataGrid, discover, unifiedTabs } = pageObjects;

      await openSourceDocViewer(pageObjects, 0);
      const originalJsonContent = await dataGrid.getJsonCodeEditorValue();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await openSourceDocViewer(pageObjects, 1);
      const tab2JsonContent = await dataGrid.getJsonCodeEditorValue();
      expect(tab2JsonContent).not.toStrictEqual(originalJsonContent);

      expect(
        await countMatchingRequests(page, ESE_SEARCH_ENDPOINT, async () => {
          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
        })
      ).toBe(0);
      expect(await dataGrid.getJsonCodeEditorValue()).toBe(originalJsonContent);

      expect(
        await countMatchingRequests(page, ESE_SEARCH_ENDPOINT, async () => {
          await unifiedTabs.selectTab(1);
          await discover.waitUntilTabIsLoaded();
        })
      ).toBe(0);
      expect(await dataGrid.getJsonCodeEditorValue()).toBe(tab2JsonContent);
    });

    spaceTest('restores source viewer scroll position per tab', async ({ pageObjects }) => {
      const { dataGrid, discover, unifiedTabs } = pageObjects;
      const scrollAmount = 200;

      await openSourceDocViewer(pageObjects, 0);
      await discover.codeEditor.setScrollTop(scrollAmount);
      const tab1ScrollTop = await discover.codeEditor.getScrollTop();
      expect(tab1ScrollTop).toBeGreaterThanOrEqual(scrollAmount);

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await openSourceDocViewer(pageObjects, 0);
      expect(await discover.codeEditor.getScrollTop()).toBe(0);

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await dataGrid.getDocViewer().waitFor({ state: 'visible' });
      expect(await discover.codeEditor.getScrollTop()).toBe(tab1ScrollTop);
    });
  }
);
