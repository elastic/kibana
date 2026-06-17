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
import { DATA_VIEWS_MANAGEMENT_PATH, ES_ARCHIVE_LOGSTASH_FUNCTIONAL } from '../fixtures/constants';
import {
  getGlobalIndexPatternsAllRole,
  getGlobalIndexPatternsReadRole,
  getNoIndexPatternsPrivilegesRole,
} from '../fixtures/services/privileges';

test.describe('Data Views feature controls security', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH_FUNCTIONAL);
  });

  test.beforeEach(async ({ kbnClient }) => {
    await kbnClient.uiSettings.replace({});
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('global indexPatterns all privileges - shows management navlink', async ({
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getGlobalIndexPatternsAllRole());
    await page.goto(kbnUrl.app('management'));
    const navLinks = await pageObjects.collapsibleNav.getNavLinks();
    expect(navLinks).toContain('Stack Management');
  });

  test('global indexPatterns all privileges - listing shows create button', async ({
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getGlobalIndexPatternsAllRole());
    await page.goto(kbnUrl.get(DATA_VIEWS_MANAGEMENT_PATH));
    await pageObjects.dataViewsManagement.waitForEmptyListingPage();
    await expect(pageObjects.dataViewsManagement.createButton).toBeVisible();
    await expect(pageObjects.dataViewsManagement.createButton).toBeEnabled();
  });

  test(`global indexPatterns all privileges - doesn't show read-only badge`, async ({
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getGlobalIndexPatternsAllRole());
    await page.goto(kbnUrl.get(DATA_VIEWS_MANAGEMENT_PATH));
    await pageObjects.dataViewsManagement.waitForEmptyListingPage();
    await expect(pageObjects.dataViewsManagement.headerBadge).toBeHidden();
  });

  test('global indexPatterns read-only privileges - shows Management navlink', async ({
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getGlobalIndexPatternsReadRole());
    await page.goto(kbnUrl.app('management'));
    const navLinks = await pageObjects.collapsibleNav.getNavLinks();
    expect(navLinks).toContain('Stack Management');
    expect(navLinks).not.toContain('Discover');
  });

  test('global indexPatterns read-only privileges - listing shows disabled create button', async ({
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getGlobalIndexPatternsReadRole());
    await page.goto(kbnUrl.get(DATA_VIEWS_MANAGEMENT_PATH));
    await pageObjects.dataViewsManagement.waitForEmptyListingPage();
    await expect(pageObjects.dataViewsManagement.createButton).toBeVisible();
    await expect(pageObjects.dataViewsManagement.createButton).toBeDisabled();
  });

  test('global indexPatterns read-only privileges - shows read-only badge', async ({
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getGlobalIndexPatternsReadRole());
    await page.goto(kbnUrl.get(DATA_VIEWS_MANAGEMENT_PATH));
    await pageObjects.dataViewsManagement.waitForEmptyListingPage();
    await expect(pageObjects.dataViewsManagement.headerBadge).toBeVisible();
    await expect(pageObjects.dataViewsManagement.headerBadge).toHaveAttribute(
      'data-test-badge-label',
      'Read only'
    );
  });

  test('no indexPatterns privileges - does not show Management navlink', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getNoIndexPatternsPrivilegesRole());
    await page.gotoApp('discover');
    const navLinks = await pageObjects.collapsibleNav.getNavLinks();
    expect(navLinks).toContain('Discover');
    expect(navLinks).not.toContain('Stack Management');
  });

  test('no indexPatterns privileges - does not allow navigation to data views management', async ({
    kbnUrl,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginWithCustomRole(getNoIndexPatternsPrivilegesRole());
    await page.goto(kbnUrl.app('management'));
    const notFoundContent = page.testSubj.locator('appNotFoundPageContent');
    await notFoundContent.waitFor({ state: 'visible' });
    await expect(notFoundContent).toBeVisible();
  });
});
