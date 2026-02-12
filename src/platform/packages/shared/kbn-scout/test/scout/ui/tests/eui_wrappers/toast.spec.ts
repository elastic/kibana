/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, expect } from '../../../../../src/playwright';
import { EuiToastWrapper } from '../../../../../src/playwright/eui_components';
import { navigateToEuiTestPage } from '../../../fixtures/eui_helpers';

// Failing: See https://github.com/elastic/kibana/issues/243243
test.describe.skip('EUI testing wrapper: EuiToast', { tag: ['@svlSecurity', '@ess'] }, () => {
  test(`toast`, async ({ page, log }) => {
    const selector = {
      locator: '.euiToast[type="info"]',
    };
    await navigateToEuiTestPage(page, 'docs/components/display/toast/#info', log);

    await test.step('should read header title and body', async () => {
      const toast = new EuiToastWrapper(page, selector);
      expect(await toast.getHeaderTitle()).toBe('Icons should be rare');
      expect(await toast.getBody()).toBe(
        'Icons should be used rarely. They are good for warnings, but when paired with long titles they look out of place.'
      );
    });

    await test.step('should close', async () => {
      const toast = new EuiToastWrapper(page, selector);
      await toast.close();
      // way to verify the toast is closed, we just check the action
    });
  });
});
