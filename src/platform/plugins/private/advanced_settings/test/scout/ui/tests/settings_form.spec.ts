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
  ACCESSIBILITY_DISABLE_ANIMATIONS_ID,
  CSV_QUOTE_VALUES_ID,
} from '@kbn/management-settings-ids';
import { test } from '../fixtures';

const MUTATED_SETTINGS = [CSV_QUOTE_VALUES_ID, ACCESSIBILITY_DISABLE_ANIMATIONS_ID];

test.describe('Advanced settings - settings form', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, kbnClient, pageObjects }) => {
    // Recover from interrupted runs on persistent Cloud targets.
    for (const setting of MUTATED_SETTINGS) {
      await kbnClient.uiSettings.unset(setting);
    }
    await browserAuth.loginAsAdmin();
    await pageObjects.settings.goto();
  });

  test.afterEach(async ({ kbnClient }) => {
    for (const setting of MUTATED_SETTINGS) {
      await kbnClient.uiSettings.unset(setting);
    }
  });

  test('updates a setting and resets it to its default value', async ({ page, pageObjects }) => {
    const field = pageObjects.settings.getField(CSV_QUOTE_VALUES_ID);

    await test.step('update the setting', async () => {
      await expect(field).toHaveAttribute('aria-checked', 'true');
      await pageObjects.settings.toggleAdvancedSettingCheckbox(CSV_QUOTE_VALUES_ID);
      await page.reload();
      await pageObjects.settings.waitForPageLoad();
      await expect(field).toHaveAttribute('aria-checked', 'false');
    });

    await test.step('reset the setting to its default value', async () => {
      await pageObjects.settings.clearAdvancedSetting(CSV_QUOTE_VALUES_ID);
      await page.reload();
      await pageObjects.settings.waitForPageLoad();
      await expect(field).toHaveAttribute('aria-checked', 'true');
    });
  });

  test('shows the page reload toast for a setting that requires a page reload', async ({
    pageObjects,
  }) => {
    const field = pageObjects.settings.getField(ACCESSIBILITY_DISABLE_ANIMATIONS_ID);
    await expect(field).toHaveAttribute('aria-checked', 'false');

    await pageObjects.settings.toggleAdvancedSettingCheckbox(ACCESSIBILITY_DISABLE_ANIMATIONS_ID);
    await expect(pageObjects.settings.reloadToastButton).toBeVisible();

    await pageObjects.settings.reloadFromToast();
    await expect(field).toHaveAttribute('aria-checked', 'true');
  });
});
