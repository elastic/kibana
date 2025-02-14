/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Page } from '@playwright/test';
import { subj } from '@kbn/test-subj-selector';
import { PathOptions } from '../../../../common/services/kibana_url';
import { KibanaUrl, ScoutLogger, coreWorkerFixtures } from '../../worker';
import { ScoutPage } from '.';

/**
 * Instead of defining each method individually, we use a list of method names and loop through them, creating methods dynamically.
 * All methods must have 'selector: string' as the first argument
 */
function extendPageWithTestSubject(page: Page): ScoutPage['testSubj'] {
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
    typeWithDelay?: ScoutPage['testSubj']['typeWithDelay'];
    clearInput?: ScoutPage['testSubj']['clearInput'];
  } = {};

  for (const method of methods) {
    extendedMethods[method] = (...args: any[]) => {
      const selector = args[0];
      const testSubjSelector = subj(selector);
      return (page[method] as Function)(testSubjSelector, ...args.slice(1));
    };
  }

  // custom method to types text into an input field character by character with a delay
  extendedMethods.typeWithDelay = async (
    selector: string,
    text: string,
    options?: { delay: number }
  ) => {
    const { delay = 25 } = options || {};
    const testSubjSelector = subj(selector);
    await page.locator(testSubjSelector).click();
    for (const char of text) {
      await page.keyboard.insertText(char);
      // it is important to delay characters input to avoid flakiness, default is 25 ms
      // eslint-disable-next-line playwright/no-wait-for-timeout
      await page.waitForTimeout(delay);
    }
  };
  // custom method to clear an input field
  extendedMethods.clearInput = async (selector: string) => {
    const testSubjSelector = subj(selector);
    await page.locator(testSubjSelector).fill('');
  };

  return extendedMethods as ScoutPage['testSubj'];
}

export function extendPlaywrightPage({
  page,
  kbnUrl,
}: {
  page: Page;
  kbnUrl: KibanaUrl;
}): ScoutPage {
  const extendedPage = page as ScoutPage;
  // Extend page with '@kbn/test-subj-selector' support
  extendedPage.testSubj = extendPageWithTestSubject(page);
  // Method to navigate to specific Kibana apps
  extendedPage.gotoApp = (appName: string, pathOptions?: PathOptions) =>
    page.goto(kbnUrl.app(appName, { pathOptions }));
  // Method to wait for global loading indicator to be hidden
  extendedPage.waitForLoadingIndicatorHidden = () =>
    extendedPage.testSubj.waitForSelector('globalLoadingIndicator-hidden', {
      state: 'attached',
    });
  return extendedPage;
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
export const scoutPageFixture = coreWorkerFixtures.extend<
  { page: ScoutPage; log: ScoutLogger },
  { kbnUrl: KibanaUrl }
>({
  page: async (
    { page, kbnUrl, log }: { page: Page; kbnUrl: KibanaUrl; log: ScoutLogger },
    use: (extendedPage: ScoutPage) => Promise<void>
  ) => {
    const extendedPage = extendPlaywrightPage({ page, kbnUrl });

    log.serviceLoaded('scoutPage');
    await use(extendedPage);
  },
});
