/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

type HistoryMode = 'scoped' | 'hash';

const historyExamples = [
  {
    ...testData.BROWSER_HISTORY_EXAMPLE,
    historyMode: 'scoped',
    testTitle: 'syncs state with platform ScopedHistory',
  },
  {
    ...testData.HASH_HISTORY_EXAMPLE,
    historyMode: 'hash',
    testTitle: 'syncs state with hash history',
  },
] as const;

const normalizeState = (state: string | undefined) => state?.replaceAll('%27', "'");

const getScopedUrl = (url: string, appId: string): string => {
  expect(url).toContain(appId);
  const scopedUrl = url.slice(url.indexOf(appId) + appId.length);
  expect(scopedUrl).not.toContain(appId);
  return scopedUrl;
};

const getRoutePath = (url: string, appId: string, historyMode: HistoryMode): string => {
  if (historyMode === 'scoped') {
    return getScopedUrl(url, appId).split('#')[0];
  }

  return new URL(url).hash.slice(1).split('?')[0];
};

const getLinkUrl = async (link: Locator, currentUrl: string): Promise<string> => {
  const href = await link.getAttribute('href');
  if (href === null) {
    throw new Error('Expected filter link to have an href');
  }
  return new URL(href, currentUrl).href;
};

const getUrlState = (url: string, appId: string, historyMode: HistoryMode): string | undefined => {
  if (historyMode === 'scoped') {
    const [, state] = getScopedUrl(url, appId).split('#');
    return normalizeState(state);
  }

  const [, state] = new URL(url).hash.slice(1).split('?');
  return normalizeState(state);
};

test.describe('State sync TODO examples', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  for (const { appId, title, historyMode, testTitle } of historyExamples) {
    test(testTitle, async ({ page, pageObjects }) => {
      const stateSyncPage = pageObjects.stateSync;
      await stateSyncPage.goto(appId, title);

      await test.step('renders filter links with the current state preserved', async () => {
        await expect(page).toHaveURL(/completed:!f/);
        const currentUrl = page.url();
        const currentState = getUrlState(currentUrl, appId, historyMode);
        expect(currentState).toBeDefined();
        const links = [
          { locator: stateSyncPage.completedFilterLink, expectedPath: '/completed' },
          { locator: stateSyncPage.notCompletedFilterLink, expectedPath: '/not-completed' },
          { locator: stateSyncPage.allFilterLink, expectedPath: '/' },
        ];

        for (const { locator, expectedPath } of links) {
          await expect
            .poll(async () => {
              const linkUrl = await getLinkUrl(locator, currentUrl);
              return {
                routePath: getRoutePath(linkUrl, appId, historyMode),
                state: getUrlState(linkUrl, appId, historyMode),
              };
            })
            .toStrictEqual({ routePath: expectedPath, state: currentState });
        }
      });

      await test.step('syncs TODO state with the URL and browser history', async () => {
        await expect(stateSyncPage.todoCheckbox).not.toBeChecked();
        await expect(page).toHaveURL(/completed:!f/);

        await stateSyncPage.completeTodo();
        await expect(stateSyncPage.todoCheckbox).toBeChecked();
        await expect(page).toHaveURL(/completed:!t/);

        await page.goBack();
        await expect(page).toHaveURL(/completed:!f/);
        await expect(stateSyncPage.todoCheckbox).not.toBeChecked();

        await page.goForward();
        await expect(page).toHaveURL(/completed:!t/);
        await expect(stateSyncPage.todoCheckbox).toBeChecked();
      });

      await test.step('navigates through filter links while preserving TODO state', async () => {
        await stateSyncPage.showNotCompletedTodos();
        await expect
          .poll(() => getRoutePath(page.url(), appId, historyMode))
          .toBe('/not-completed');
        await expect(stateSyncPage.todoCheckbox).toHaveCount(0);
      });
    });
  }
});
