/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../fixtures';
import {
  getGlobalAdvancedSettingsAllRole,
  getGlobalAdvancedSettingsReadRole,
  getNoAdvancedSettingsPrivilegesRole,
} from '../fixtures/services/privileges';

test.describe('security feature controls', { tag: tags.stateful.classic }, () => {
  test('global advanced_settings all privileges - shows management navlink', async ({
    kbnClient,
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await kbnClient.uiSettings.replace({});
    await browserAuth.loginWithCustomRole(getGlobalAdvancedSettingsAllRole());
    await page.goto(kbnUrl.app('management'));
    const navLinks = await pageObjects.settings.getNavLinks();
    expect(navLinks).toContain('Stack Management');
  });

  test('global advanced_settings all privileges - allows settings to be changed', async ({
    kbnClient,
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await kbnClient.uiSettings.replace({});
    await browserAuth.loginWithCustomRole(getGlobalAdvancedSettingsAllRole());
    await page.goto(kbnUrl.get('/app/management/kibana/settings'));
    await pageObjects.settings.waitForPageLoad();
    await pageObjects.settings.setAdvancedSettingsSelect('dateFormat:tz', 'America/Phoenix');
    const advancedSetting = await pageObjects.settings.getAdvancedSettingValue('dateFormat:tz');
    expect(advancedSetting).toBe('America/Phoenix');
  });

  test(`global advanced_settings all privileges - doesn't show read-only badge`, async ({
    kbnClient,
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await kbnClient.uiSettings.replace({});
    await browserAuth.loginWithCustomRole(getGlobalAdvancedSettingsAllRole());
    await page.goto(kbnUrl.get('/app/management/kibana/settings'));
    await pageObjects.settings.waitForPageLoad();
    const badgeVisible = await pageObjects.settings.isHeaderBadgeVisible();
    expect(badgeVisible).toBe(false);
  });

  test('global advanced_settings read-only privileges - shows Management navlink', async ({
    kbnClient,
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await kbnClient.uiSettings.replace({});
    await browserAuth.loginWithCustomRole(getGlobalAdvancedSettingsReadRole());
    await page.goto(kbnUrl.app('management'));
    const navLinks = await pageObjects.settings.getNavLinks();
    expect(navLinks).toContain('Stack Management');
  });

  test('global advanced_settings read-only privileges - does not allow settings to be changed', async ({
    kbnClient,
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await kbnClient.uiSettings.replace({});
    await browserAuth.loginWithCustomRole(getGlobalAdvancedSettingsReadRole());
    await page.goto(kbnUrl.get('/app/management/kibana/settings'));
    await pageObjects.settings.waitForPageLoad();
    const isDisabled = await pageObjects.settings.isSettingDisabled('dateFormat:tz');
    expect(isDisabled).toBe(true);
  });

  test('global advanced_settings read-only privileges - shows read-only badge', async ({
    kbnClient,
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await kbnClient.uiSettings.replace({});
    await browserAuth.loginWithCustomRole(getGlobalAdvancedSettingsReadRole());
    await page.goto(kbnUrl.get('/app/management/kibana/settings'));
    await pageObjects.settings.waitForPageLoad();
    const badgeVisible = await pageObjects.settings.isHeaderBadgeVisible();
    expect(badgeVisible).toBe(true);
    const badgeText = await pageObjects.settings.getHeaderBadgeText();
    expect(badgeText?.toUpperCase()).toBe('READ ONLY');
  });

  test('no advanced_settings privileges - does not show Management navlink', async ({
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getNoAdvancedSettingsPrivilegesRole());
    await page.goto(kbnUrl.app('discover'));
    const navLinks = await pageObjects.settings.getNavLinks();
    expect(navLinks).toContain('Discover');
    expect(navLinks).not.toContain('Stack Management');
  });

  test('no advanced_settings privileges - does not allow navigation to advanced settings; shows "not found" error', async ({
    kbnUrl,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginWithCustomRole(getNoAdvancedSettingsPrivilegesRole());
    await page.goto(kbnUrl.get('/app/management/kibana/settings'));
    const notFoundContent = page.testSubj.locator('appNotFoundPageContent');
    await notFoundContent.waitFor({ state: 'visible' });
    await expect(notFoundContent).toBeVisible();
  });
});
