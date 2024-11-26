/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Page, test as base } from '@playwright/test';
import { subj } from '@kbn/test-subj-selector';
import { ScoutPage, KibanaUrl } from '../types';

/**
 * Instead of defining each method individually, we use a list of method names and loop through them, creating methods dynamically.
 * All methods must have 'selector: string' as the first argument
 */
function extendPageWithTestSubject(page: Page) {
  const methods: Array<keyof Page> = [
    'check',
    'click',
    'dblclick',
    'fill',
    'focus',
    'getAttribute',
    'hover',
    'isEnabled',
    'innerText',
    'isChecked',
    'isHidden',
    'isVisible',
    'locator',
    'waitForSelector',
  ];

  const extendedMethods: Partial<Record<keyof Page, Function>> & {
    typeSlowly?: (selector: string, text: string) => Promise<void>;
  } = {};

  for (const method of methods) {
    extendedMethods[method] = (...args: any[]) => {
      const selector = args[0];
      const testSubjSelector = subj(selector);
      return (page[method] as Function)(testSubjSelector, ...args.slice(1));
    };
  }

  // custom method to type text slowly
  extendedMethods.typeSlowly = async (selector: string, text: string) => {
    for (const char of text) {
      const testSubjSelector = subj(selector);
      await page.locator(testSubjSelector).click();
      await page.keyboard.press(char);
      await page.waitForTimeout(25); // Delay in milliseconds
    }
  };

  return extendedMethods as Record<keyof Page, any> & {
    typeSlowly: ScoutPage['testSubj']['typeSlowly'];
  };
}

/**
 * Extends the 'page' fixture with Kibana-specific functionality
 *
 * 1. Allow calling methods with simplified 'data-test-subj' selectors.
 * Instead of manually constructing 'data-test-subj' selectors, this extension provides a `testSubj` object on the page
 * Supported methods include `click`, `check`, `fill`, and others that interact with `data-test-subj`.
 *
 * Example Usage:
 *
 * ```typescript
 * // Without `testSubj` extension:
 * await page.locator('[data-test-subj="foo"][data-test-subj="bar"]').click();
 *
 * // With `testSubj` extension:
 * await page.testSubj.click('foo & bar');
 * ```
 *
 * 2. Navigate to Kibana apps by using 'kbnUrl' fixture
 *
 * Example Usage:
 *
 * ```typescript
 * // Navigate to '/app/discover'
 * await page.gotoApp('discover);
 * ```
 */
export const scoutPageFixture = base.extend<{ page: ScoutPage; kbnUrl: KibanaUrl }>({
  page: async ({ page, kbnUrl }, use) => {
    // Extend page with '@kbn/test-subj-selector' support
    page.testSubj = extendPageWithTestSubject(page);

    // Method to navigate to specific Kibana apps
    page.gotoApp = (appName: string) => page.goto(kbnUrl.app(appName));

    await use(page);
  },
});
