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

const prepareDiscoverWithoutCustomDataViews = async ({
  browserAuth,
  pageObjects,
  scoutSpace,
}: {
  browserAuth: DiscoverTestFixtures['browserAuth'];
  pageObjects: DiscoverTestFixtures['pageObjects'];
  scoutSpace: DiscoverWorkerFixtures['scoutSpace'];
}) => {
  await scoutSpace.savedObjects.cleanStandardList();
  await scoutSpace.uiSettings.unset('defaultIndex');
  await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);

  await browserAuth.loginAsPrivilegedUser();
  await pageObjects.discover.setQueryMode('classic');
};

const openDiscoverWithoutCustomDataViews = async ({
  page,
  scoutSpace,
  solutionView,
}: {
  page: ScoutPage;
  scoutSpace: DiscoverWorkerFixtures['scoutSpace'];
  solutionView: SpaceSolutionView;
}) => {
  await scoutSpace.setSolutionView(solutionView);
  await page.gotoApp('discover');
};

spaceTest.describe(
  'Discover tabs - no custom data view',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects, scoutSpace }) => {
      await prepareDiscoverWithoutCustomDataViews({
        browserAuth,
        pageObjects,
        scoutSpace,
      });
    });

    spaceTest.afterEach(async ({ scoutSpace }) => {
      await scoutSpace.setSolutionView('classic');
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    });

    spaceTest(
      'shows tabs bar by default in classic solution type',
      async ({ page, pageObjects, scoutSpace }) => {
        const { discover, unifiedTabs } = pageObjects;

        await openDiscoverWithoutCustomDataViews({ page, scoutSpace, solutionView: 'classic' });

        await expect(page.testSubj.locator('noDataViewsPrompt')).toBeHidden();
        expect(await discover.getSelectedDataViewName()).toBe('All logs');
        expect(await unifiedTabs.isTabsBarVisible()).toBe(true);
      }
    );

    spaceTest(
      'shows tabs bar after creating a data view from the non-classic no-data prompt',
      async ({ page, pageObjects, scoutSpace }) => {
        const { dataGrid, discover, unifiedTabs } = pageObjects;

        await spaceTest.step('open Discover with no custom data views', async () => {
          await openDiscoverWithoutCustomDataViews({ page, scoutSpace, solutionView: 'es' });

          await expect(page.testSubj.locator('noDataViewsPrompt')).toBeVisible();
          expect(await unifiedTabs.isTabsBarVisible()).toBe(false);
        });

        await spaceTest.step('create a data view and show the tabs bar', async () => {
          await discover.createDataViewFromNoDataPrompt({ name: 'logstash' });

          expect(await discover.getSelectedDataViewName()).toBe('logstash*');
          expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);
          expect(await unifiedTabs.isTabsBarVisible()).toBe(true);
        });
      }
    );

    spaceTest(
      'can enter ES query mode in non-classic solution type',
      async ({ page, pageObjects, scoutSpace }) => {
        const { dataGrid, discover, unifiedTabs } = pageObjects;

        await openDiscoverWithoutCustomDataViews({ page, scoutSpace, solutionView: 'es' });

        await expect(page.testSubj.locator('noDataViewsPrompt')).toBeVisible();
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
