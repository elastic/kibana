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
  ALL_TIMES_DESC,
  CONTEXT_AWARENESS_TIME_RANGE,
  PROFILE_DATA_VIEW,
  PROFILE_DATA_VIEW_FIELD_COUNT,
} from '../fixtures';

/**
 * What Discover falls back to when a space has no data views of its own: the ad hoc data view from
 * `example-root-profile` takes over, so the user lands on something usable rather than the
 * onboarding page. The space deliberately never loads the context awareness saved objects.
 *
 * The companion case — the onboarding page still winning when the cluster holds no data at all, so
 * that a profile-contributed data view cannot mask it — is covered by
 * application/main/discover_main_route.test.tsx. It cannot live here: a shared deployment gives no
 * way to guarantee that nothing anywhere holds data.
 */
spaceTest.describe(
  'Discover context awareness - extension getDefaultAdHocDataViews, fallback',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.uiSettings.setDefaultTime(CONTEXT_AWARENESS_TIME_RANGE);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'falls back to the profile data view when the space has no other data views',
      async ({ browserAuth, page, pageObjects }) => {
        const { dataGrid, discover, unifiedFieldList } = pageObjects;

        await browserAuth.loginAsAdmin();
        await discover.goto({ queryMode: 'classic' });
        await discover.waitUntilSearchingHasFinished();

        expect(await discover.getSelectedDataViewName()).toBe(PROFILE_DATA_VIEW);

        await discover.getSelectedDataView().click();
        await expect(
          page.testSubj.locator(`dataViewItemManagedBadge-${PROFILE_DATA_VIEW}`)
        ).toBeVisible();
        await page.keyboard.press('Escape');

        // Field count and the first row together show the fallback data view resolved its fields
        // and actually searched against them.
        await expect(unifiedFieldList.getSidebarSectionCountLocator('available')).toHaveText(
          PROFILE_DATA_VIEW_FIELD_COUNT
        );
        await expect(dataGrid.getCell(0, '@timestamp')).toContainText(ALL_TIMES_DESC[0]);
      }
    );
  }
);
