/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('spaces feature controls', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['config'] });
    await kbnClient.spaces.create({
      id: 'custom_space',
      name: 'custom_space',
      disabledFeatures: [],
    });
    await kbnClient.spaces.create({
      id: 'custom_space_disabled',
      name: 'custom_space_disabled',
      disabledFeatures: ['advancedSettings'],
    });
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.spaces.delete('custom_space');
    await kbnClient.spaces.delete('custom_space_disabled');
    await kbnClient.savedObjects.clean({ types: ['config'] });
  });

  test('space with no features disabled - shows Management navlink', async ({
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.app('home', { space: 'custom_space' }));
    const navLinks = await pageObjects.collapsibleNav.getNavLinks();
    expect(navLinks).toContain('Stack Management');
  });

  test('space with no features disabled - allows settings to be changed', async ({
    kbnUrl,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.app('management/kibana/settings', { space: 'custom_space' }));
    await pageObjects.settings.waitForPageLoad();
    await pageObjects.settings.setAdvancedSettingsSelect('dateFormat:tz', 'America/Phoenix');
    const advancedSetting = await pageObjects.settings.getAdvancedSettingValue('dateFormat:tz');
    expect(advancedSetting).toBe('America/Phoenix');
  });

  test('space with Advanced Settings disabled - redirects to management home', async ({
    kbnUrl,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get('/s/custom_space_disabled/app/management/kibana/settings'));
    const managementHome = page.testSubj.locator('managementHome');
    await managementHome.waitFor({ state: 'visible' });
    await expect(managementHome).toBeVisible();
  });
});
