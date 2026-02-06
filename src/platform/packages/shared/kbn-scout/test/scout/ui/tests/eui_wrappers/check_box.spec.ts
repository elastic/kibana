/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable playwright/prefer-web-first-assertions */

// TODO: 'toBeChecked' is not available in playwright version we are using. Remove after Playwright upgrade

import { test, expect } from '../../../../../src/playwright';
import { EuiCheckBoxWrapper } from '../../../../../src/playwright/eui_components';
import { navigateToEuiTestPage } from '../../../fixtures/eui_helpers';

// Failing: See https://github.com/elastic/kibana/issues/244454
test.describe.skip('EUI testing wrapper: EuiCheckBox', { tag: ['@svlSecurity', '@ess'] }, () => {
  test(`checkbox`, async ({ page, log }) => {
    const selector = {
      locator:
        'xpath=(//div[contains(@class, "euiCheckbox") and div[contains(@class, "euiCheckbox__square")]])[1]',
    };

    await navigateToEuiTestPage(
      page,
      'docs/components/forms/selection/checkbox-and-checkbox-group/#checkbox',
      log
    );

    await test.step('should be checked', async () => {
      const checkBox = new EuiCheckBoxWrapper(page, selector);
      expect(await checkBox.isChecked()).toBe(false);
      await checkBox.check();
      expect(await checkBox.isChecked()).toBe(true);
    });

    await test.step('should be unchecked', async () => {
      const checkBox = new EuiCheckBoxWrapper(page, selector);
      await checkBox.uncheck();
      expect(await checkBox.isChecked()).toBe(false);
    });

    await test.step('should return label text', async () => {
      const checkBox = new EuiCheckBoxWrapper(page, selector);
      expect(await checkBox.getLabel()).toBe('I am a checkbox');
    });
  });
});
