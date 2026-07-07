/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage, SpaceSolutionView } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { DiscoverTestFixtures, DiscoverWorkerFixtures } from '../../../fixtures/common';
import { spaceTest } from '../../../fixtures/common';
import { DEFAULT_TIME_RANGE } from '../../../fixtures/common/constants';

const createDataViewFromPrompt = async (page: ScoutPage, name: string) => {
  await page.testSubj.locator('createDataViewButton').click();

  const flyout = page.testSubj.locator('indexPatternEditorFlyout');
  await flyout.waitFor({ state: 'visible' });

  const titleInput = page.testSubj.locator('createIndexPatternTitleInput');
  await titleInput.clear();
  await titleInput.pressSequentially(name);
  await page.testSubj.locator('saveIndexPatternButton').click();
  await flyout.waitFor({ state: 'hidden' });
};

const prepareDiscoverWithoutCustomDataViews = async ({
  browserAuth,
  page,
  pageObjects,
  scoutSpace,
  solutionView,
}: {
  browserAuth: DiscoverTestFixtures['browserAuth'];
  page: ScoutPage;
  pageObjects: DiscoverTestFixtures['pageObjects'];
  scoutSpace: DiscoverWorkerFixtures['scoutSpace'];
  solutionView: SpaceSolutionView;
}) => {
  await scoutSpace.savedObjects.cleanStandardList();
  await scoutSpace.uiSettings.unset('defaultIndex');
  await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
  await scoutSpace.setSolutionView(solutionView);

  await browserAuth.loginAsPrivilegedUser();
  await pageObjects.discover.setQueryMode('classic');
  await page.gotoApp('discover');
};

spaceTest.describe(
  'Discover tabs - no custom data view',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.afterEach(async ({ scoutSpace }) => {
      await scoutSpace.setSolutionView('classic');
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    });

    spaceTest(
      'shows tabs bar by default in classic solution type',
      async ({ browserAuth, page, pageObjects, scoutSpace }) => {
        const { discover, unifiedTabs } = pageObjects;

        await prepareDiscoverWithoutCustomDataViews({
          browserAuth,
          page,
          pageObjects,
          scoutSpace,
          solutionView: 'classic',
        });

        await page.testSubj.locator('noDataViewsPrompt').waitFor({ state: 'hidden' });
        expect(await discover.getSelectedDataViewName()).toBe('All logs');
        expect(await unifiedTabs.isTabsBarVisible()).toBe(true);
      }
    );

    spaceTest(
      'can create a new data view in non-classic solution type',
      async ({ browserAuth, page, pageObjects, scoutSpace }) => {
        const { dataGrid, discover, unifiedTabs } = pageObjects;

        await prepareDiscoverWithoutCustomDataViews({
          browserAuth,
          page,
          pageObjects,
          scoutSpace,
          solutionView: 'es',
        });

        await page.testSubj.locator('noDataViewsPrompt').waitFor({ state: 'visible' });
        expect(await unifiedTabs.isTabsBarVisible()).toBe(false);

        await createDataViewFromPrompt(page, 'logstash');
        await discover.waitUntilTabIsLoaded();

        expect(await discover.getSelectedDataViewName()).toBe('logstash*');
        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);
        expect(await unifiedTabs.isTabsBarVisible()).toBe(true);
      }
    );

    spaceTest(
      'can enter ES query mode in non-classic solution type',
      async ({ browserAuth, page, pageObjects, scoutSpace }) => {
        const { dataGrid, discover, unifiedTabs } = pageObjects;

        await prepareDiscoverWithoutCustomDataViews({
          browserAuth,
          page,
          pageObjects,
          scoutSpace,
          solutionView: 'es',
        });

        await page.testSubj.locator('noDataViewsPrompt').waitFor({ state: 'visible' });
        expect(await unifiedTabs.isTabsBarVisible()).toBe(false);

        await page.testSubj.locator('tryESQLLink').click();
        await discover.waitUntilTabIsLoaded();

        expect(await discover.getEsqlQueryValue()).toBe('FROM logs*');
        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);
        expect(await unifiedTabs.isTabsBarVisible()).toBe(true);
      }
    );
  }
);
