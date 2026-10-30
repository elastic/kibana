/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// FTR source: x-pack/platform/test/accessibility/apps/group1/advanced_settings.ts
//             src/platform/test/accessibility/apps/management.ts
//             -> describe('data views') -> it('Advanced settings')

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const QUOTE_VALUES_SETTING = 'csv:quoteValues';
const SEPARATOR_SETTING = 'csv:separator';
const NEW_SEPARATOR = ';';

// This suite only scans the in-app content; toasts render outside of it.
const A11Y_SELECTORS = ['.kbnAppWrapper'];

test.describe('Advanced settings - edit and save', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, kbnClient, pageObjects }) => {
    await kbnClient.uiSettings.unset(QUOTE_VALUES_SETTING);
    await kbnClient.uiSettings.unset(SEPARATOR_SETTING);
    await browserAuth.loginAsAdmin();
    await pageObjects.settings.goto();
  });

  test.afterEach(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset(QUOTE_VALUES_SETTING);
    await kbnClient.uiSettings.unset(SEPARATOR_SETTING);
  });

  test('searches, edits and saves settings without a11y violations', async ({
    page,
    pageObjects,
  }) => {
    const { settings } = pageObjects;

    const expectNoA11yViolations = async () => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    };

    await test.step('settings page as it first renders', async () => {
      await expectNoA11yViolations();
    });

    await test.step('search for the csv settings', async () => {
      await settings.searchBar.fill('csv');
      await expect(settings.getField(QUOTE_VALUES_SETTING)).toBeVisible();
      await expect(settings.getField(SEPARATOR_SETTING)).toBeVisible();
      await expectNoA11yViolations();
      // The first click after typing in the search box is swallowed by the blur.
      await settings.searchBar.blur();
    });

    await test.step('toggle a boolean setting', async () => {
      const initialValue = await settings.getAdvancedSettingCheckboxValue(QUOTE_VALUES_SETTING);
      await settings.getField(QUOTE_VALUES_SETTING).click();
      await expect(settings.saveButton).toBeVisible();
      expect(await settings.getAdvancedSettingCheckboxValue(QUOTE_VALUES_SETTING)).toBe(
        !initialValue
      );
      await expectNoA11yViolations();
    });

    await test.step('edit a text setting', async () => {
      await settings.getField(SEPARATOR_SETTING).fill(NEW_SEPARATOR);
      await expectNoA11yViolations();
    });

    await test.step('save the changes', async () => {
      await settings.saveAndWait();
      expect(await settings.getAdvancedSettingValue(SEPARATOR_SETTING)).toBe(NEW_SEPARATOR);
      await expectNoA11yViolations();
    });
  });
});
