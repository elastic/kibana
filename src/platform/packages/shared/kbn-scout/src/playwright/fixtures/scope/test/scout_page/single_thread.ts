/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { subj } from '@kbn/test-subj-selector';
import type { Page } from '@playwright/test';
import { test as base } from '@playwright/test';
import type { ScoutPage } from '.';
import type { PathOptions } from '../../../../../common/services/kibana_url';
import { keyTo, checkA11y } from '../../../../utils';
import type { KibanaUrl, ScoutLogger } from '../../worker';

/**
 * Types text into an input field character by character with a specified delay to mimic realistic user typing.
 */
async function typeWithDelay(
  page: Page,
  selector: string,
  text: string,
  options?: { delay: number }
): Promise<void> {
  const { delay = 50 } = options || {};
  await page.locator(selector).click();
  for (const char of text) {
    await page.keyboard.insertText(char);
    // Delays character input by 50ms (default) to prevent flakiness from rushed automation.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(delay);
  }
}

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
    dragTo?: ScoutPage['testSubj']['dragTo'];
  } = {};

  for (const method of methods) {
    extendedMethods[method] = (...args: any[]) => {
      const selector = args[0];
      const testSubjSelector = subj(selector);
      return (page[method] as Function)(testSubjSelector, ...args.slice(1));
    };
  }

  // custom method to types text into an input field character by character with a delay
  extendedMethods.typeWithDelay = (selector: string, text: string, options?: { delay: number }) =>
    typeWithDelay(page, subj(selector), text, options);

  // custom method to clear an input field
  extendedMethods.clearInput = async (selector: string) => {
    const testSubjSelector = subj(selector);
    await page.locator(testSubjSelector).fill('');
  };

  // custom method to drag an element to another element
  extendedMethods.dragTo = async (sourceSelector: string, targetSelector: string) => {
    const sourceTestSubjSelector = subj(sourceSelector);
    const targetTestSubjSelector = subj(targetSelector);
    await page.locator(sourceTestSubjSelector).dragTo(page.locator(targetTestSubjSelector));
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
  // Method to press a key until an element with the provided selector is in focus.
  extendedPage.keyTo = async (
    selector: string,
    key: string,
    maxElementsToTraverse: number = 1000
  ) => {
    return await keyTo(page, selector, key, maxElementsToTraverse);
  };

  extendedPage.checkA11y = (options) => checkA11y(page, options);

  // Method to type text with delay character by character
  extendedPage.typeWithDelay = (selector: string, text: string, options?: { delay: number }) =>
    typeWithDelay(page, selector, text, options);
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
export const scoutPageFixture = base.extend<
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
