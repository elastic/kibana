/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: 'toBeChecked' is not available in playwright version we are using. Remove after Playwright upgrade

import { test, expect } from '../../../../../src/playwright';
import { EuiFieldTextWrapper } from '../../../../../src/playwright/eui_components';
import { navigateToEuiTestPage } from '../../../fixtures/eui_helpers';

test.describe('EUI testing wrapper: EuiFieldText', { tag: ['@svlSecurity', '@ess'] }, () => {
  test(`fieldText`, async ({ page, log }) => {
    const selector = {
      locator: 'xpath=(//div[contains(@class, "euiFormControlLayout")])[1]',
    };

    await navigateToEuiTestPage(page, 'docs/components/forms/text/#text-field', log);

    await test.step('should input text', async () => {
      const fieldText = new EuiFieldTextWrapper(page, selector);
      const testValue = 'Test input value';
      await fieldText.fill(testValue);
      expect(await fieldText.getValue()).toBe(testValue);
    });
  });
});
