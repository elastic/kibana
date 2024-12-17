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
import { ScoutPage, KibanaUrl, ScoutTestFixtures, ScoutWorkerFixtures } from '../types';

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
    'locator',
  ];

  const extendedMethods: Partial<Record<keyof Page, Function>> = {};

  for (const method of methods) {
    extendedMethods[method] = (...args: any[]) => {
      const selector = args[0];
      const testSubjSelector = subj(selector);
      return (page[method] as Function)(testSubjSelector, ...args.slice(1));
    };
  }

  return extendedMethods as Record<keyof Page, any>;
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
export const scoutPageFixture = base.extend<ScoutTestFixtures, ScoutWorkerFixtures>({
  page: async (
    { page, kbnUrl }: { page: Page; kbnUrl: KibanaUrl },
    use: (extendedPage: ScoutPage) => Promise<void>
  ) => {
    const extendedPage = page as ScoutPage;
    // Extend page with '@kbn/test-subj-selector' support
    extendedPage.testSubj = extendPageWithTestSubject(page);
    // Method to navigate to specific Kibana apps
    extendedPage.gotoApp = (appName: string) => page.goto(kbnUrl.app(appName));

    await use(extendedPage);
  },
});
