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
import * as settings from '@kbn/management-settings-ids';
import { ALL_COMMON_SETTINGS } from '@kbn/serverless-common-settings';
import { test } from '../fixtures';

// Code editors don't render their field test subject.
const EDITOR_SETTINGS = new Set<string>([
  settings.BANNERS_TEXT_CONTENT_ID,
  settings.DATE_FORMAT_SCALED_ID,
  settings.NOTIFICATIONS_BANNER_ID,
  settings.TIMEPICKER_TIME_DEFAULTS_ID,
  settings.TIMEPICKER_QUICK_RANGES_ID,
]);

const GLOBAL_SETTINGS = new Set<string>([
  settings.XPACK_CUSTOM_BRANDING_LOGO_ID,
  settings.XPACK_CUSTOM_BRANDING_FAVICON_PNG_ID,
  settings.XPACK_CUSTOM_BRANDING_FAVICON_SVG_ID,
  settings.XPACK_CUSTOM_BRANDING_CUSTOMIZED_LOGO_ID,
]);

const RENDERED_COMMON_SETTINGS = ALL_COMMON_SETTINGS.filter((id) => !EDITOR_SETTINGS.has(id));

const COMMON_SPACE_SETTINGS = RENDERED_COMMON_SETTINGS.filter((id) => !GLOBAL_SETTINGS.has(id));
const COMMON_GLOBAL_SETTINGS = RENDERED_COMMON_SETTINGS.filter((id) => GLOBAL_SETTINGS.has(id));

test.describe('Advanced settings - common settings', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.settings.goto();
  });

  test('renders every common space and global setting field', async ({ pageObjects }) => {
    await test.step('space settings tab', async () => {
      for (const settingId of COMMON_SPACE_SETTINGS) {
        await expect.soft(pageObjects.settings.getField(settingId), settingId).toBeVisible();
      }
    });

    await test.step('global settings tab', async () => {
      await pageObjects.settings.openGlobalSettingsTab();
      for (const settingId of COMMON_GLOBAL_SETTINGS) {
        await expect.soft(pageObjects.settings.getField(settingId), settingId).toBeVisible();
      }
    });
  });
});
