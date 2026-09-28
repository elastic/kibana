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
import {
  spaceTest,
  setupContextAwareness,
  teardownContextAwareness,
  ALL_TIMES_DESC,
  GRID_VIEWPORT,
  PROFILE_DATA_VIEW,
  PROFILE_DATA_VIEW_FIELD_COUNT,
} from '../fixtures';

const SESSION_NAME = 'Default profile data view session';
const SESSION_DATA_VIEW = `${PROFILE_DATA_VIEW} (${SESSION_NAME})`;

const managedBadge = (dataViewName: string) => `dataViewItemManagedBadge-${dataViewName}`;

/**
 * `example-root-profile` contributes an ad hoc data view that Discover offers alongside the saved
 * ones. It is flagged as managed, has to survive a page reload without erroring, and saving a
 * Discover session has to fork it into an editable copy rather than persisting the managed original.
 */
spaceTest.describe(
  'Discover context awareness - extension getDefaultAdHocDataViews',
  { tag: tags.deploymentAgnostic },
  () => {
    // The last row's timestamp is asserted, and the grid only mounts rows that fit the viewport.
    spaceTest.use({ viewport: GRID_VIEWPORT });

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.goto({ queryMode: 'classic' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest(
      'offers the profile data view in the picker as a managed one',
      async ({ page, pageObjects }) => {
        const { dataGrid, discover, unifiedFieldList } = pageObjects;

        // It is offered, not selected: the profile must not hijack the initial data view.
        expect(await discover.getSelectedDataViewName()).not.toBe(PROFILE_DATA_VIEW);

        await discover.selectDataView(PROFILE_DATA_VIEW, { createAdHocIfMissing: false });
        await discover.waitUntilSearchingHasFinished();

        await discover.getSelectedDataView().click();
        await expect(page.testSubj.locator(managedBadge(PROFILE_DATA_VIEW))).toBeVisible();
        await page.keyboard.press('Escape');

        await expect(unifiedFieldList.getSidebarSectionCountLocator('available')).toHaveText(
          PROFILE_DATA_VIEW_FIELD_COUNT
        );

        // First and last row together show the grid rendered the whole result set, in order.
        await expect(dataGrid.getCell(0, '@timestamp')).toContainText(ALL_TIMES_DESC[0]);
        await expect(dataGrid.getCell(5, '@timestamp')).toContainText(ALL_TIMES_DESC[5]);
      }
    );

    spaceTest(
      'reloads the profile data view on page refresh without an error toast',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await discover.selectDataView(PROFILE_DATA_VIEW, { createAdHocIfMissing: false });
        await discover.waitUntilSearchingHasFinished();

        await page.reload();
        await discover.waitUntilTabIsLoaded();

        // An ad hoc data view has no saved object to reload from, so a regression here surfaces as
        // a "data view not found" toast.
        await expect(page.components.toast().toasts).toHaveCount(0);
        expect(await discover.getSelectedDataViewName()).toBe(PROFILE_DATA_VIEW);

        await discover.getSelectedDataView().click();
        await expect(page.testSubj.locator(managedBadge(PROFILE_DATA_VIEW))).toBeVisible();
        await page.keyboard.press('Escape');
      }
    );

    spaceTest(
      'forks the profile data view into an unmanaged copy when saving the session',
      async ({ page, pageObjects }) => {
        const { dataGrid, discover, unifiedFieldList } = pageObjects;

        await discover.selectDataView(PROFILE_DATA_VIEW, { createAdHocIfMissing: false });
        await discover.waitUntilSearchingHasFinished();

        await discover.saveSearch(SESSION_NAME);
        await discover.waitUntilSearchingHasFinished();

        expect(await discover.getSelectedDataViewName()).toBe(SESSION_DATA_VIEW);

        await discover.getSelectedDataView().click();
        await expect(page.testSubj.locator(managedBadge(SESSION_DATA_VIEW))).toBeHidden();
        await page.keyboard.press('Escape');

        await expect(unifiedFieldList.getSidebarSectionCountLocator('available')).toHaveText(
          PROFILE_DATA_VIEW_FIELD_COUNT
        );
        await expect(dataGrid.getCell(0, '@timestamp')).toContainText(ALL_TIMES_DESC[0]);
        await expect(dataGrid.getCell(5, '@timestamp')).toContainText(ALL_TIMES_DESC[5]);

        // The managed original stays available and unchanged next to the copy.
        await discover.selectDataView(PROFILE_DATA_VIEW, { createAdHocIfMissing: false });
        await discover.waitUntilSearchingHasFinished();

        await discover.getSelectedDataView().click();
        await expect(page.testSubj.locator(managedBadge(PROFILE_DATA_VIEW))).toBeVisible();
        await page.keyboard.press('Escape');

        await expect(unifiedFieldList.getSidebarSectionCountLocator('available')).toHaveText(
          PROFILE_DATA_VIEW_FIELD_COUNT
        );
        await expect(dataGrid.getCell(0, '@timestamp')).toContainText(ALL_TIMES_DESC[0]);
        await expect(dataGrid.getCell(5, '@timestamp')).toContainText(ALL_TIMES_DESC[5]);
      }
    );
  }
);
