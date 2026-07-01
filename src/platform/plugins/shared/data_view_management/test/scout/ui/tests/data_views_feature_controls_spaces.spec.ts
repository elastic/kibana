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
import {
  ES_ARCHIVE_LOGSTASH_FUNCTIONAL,
  FEATURE_CONTROLS_CUSTOM_SPACE,
  FEATURE_CONTROLS_CUSTOM_SPACE_DISABLED,
} from '../fixtures/constants';

test.describe('Data Views feature controls spaces', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH_FUNCTIONAL);
    await kbnClient.spaces.delete(FEATURE_CONTROLS_CUSTOM_SPACE.id).catch(() => {});
    await kbnClient.spaces.create(FEATURE_CONTROLS_CUSTOM_SPACE);
    await kbnClient.spaces.delete(FEATURE_CONTROLS_CUSTOM_SPACE_DISABLED.id).catch(() => {});
    await kbnClient.spaces.create(FEATURE_CONTROLS_CUSTOM_SPACE_DISABLED);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.spaces.delete(FEATURE_CONTROLS_CUSTOM_SPACE.id).catch(() => {});
    await kbnClient.spaces.delete(FEATURE_CONTROLS_CUSTOM_SPACE_DISABLED.id).catch(() => {});
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('space with no features disabled - shows Management navlink', async ({
    kbnUrl,
    page,
    pageObjects,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('home:welcome:show', 'false');
    });
    await page.goto(kbnUrl.app('home', { space: FEATURE_CONTROLS_CUSTOM_SPACE.id }));
    await page.testSubj.locator('homeApp').waitFor({ state: 'visible' });
    const navLinks = await pageObjects.collapsibleNav.getNavLinks();
    expect(navLinks).toContain('Stack Management');
  });

  test('space with no features disabled - data views listing shows create button', async ({
    kbnUrl,
    page,
    pageObjects,
  }) => {
    await page.goto(
      kbnUrl.get(`/s/${FEATURE_CONTROLS_CUSTOM_SPACE.id}/app/management/kibana/dataViews`)
    );
    await pageObjects.dataViewsManagement.waitForEmptyListingPage();
    await expect(pageObjects.dataViewsManagement.createButton).toBeVisible();
    await expect(pageObjects.dataViewsManagement.createButton).toBeEnabled();
  });

  test('space with Data Views disabled - redirects to management home', async ({
    kbnUrl,
    page,
  }) => {
    await page.goto(
      kbnUrl.get(
        `/s/${FEATURE_CONTROLS_CUSTOM_SPACE_DISABLED.id}/app/management/kibana/indexPatterns`
      )
    );
    const managementHome = page.testSubj.locator('managementHome');
    await managementHome.waitFor({ state: 'visible' });
    await expect(managementHome).toBeVisible();
  });
});
