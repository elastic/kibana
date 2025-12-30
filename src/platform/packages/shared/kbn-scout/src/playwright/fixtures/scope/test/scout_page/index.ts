/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Page } from '@playwright/test';
import type { RunA11yScanOptions } from '../../../../utils';
import type { PathOptions } from '../../../../../common/services/kibana_url';

/**
 * Extends the Playwright 'Page' interface with methods specific to Kibana.
 * Reasons to use 'ReturnType' instead of Explicit Typings:
 * - DRY Principle: automatically stays in sync with the Playwright API, reducing maintenance overhead.
 * - Future-Proofing: If Playwright changes the return type of methods, these types will update accordingly.
 * Recommendation: define Explicit Types as return types only if methods (e.g. 'typeWithDelay')
 * have any additional logic or Kibana-specific behavior.
 */
export type ScoutPage = Page & {
  /**
   * Navigates to the specified Kibana application.
   * @param appName - The name of the Kibana app (e.g., 'discover', 'dashboard').
   * @param options - Additional navigation options, passed directly to Playwright's `goto` method.
   * @returns A Promise resolving to a Playwright `Response` or `null`.
   */
  gotoApp: (appName: string, pathOptions?: PathOptions) => ReturnType<Page['goto']>;
  /**
   * Waits for the Kibana loading spinner indicator to disappear.
   * @deprecated This method is flaky on CI. We strongly recommend waiting for specific elements instead: page.testSubj.waitForSelector('table-is-ready', { state: 'visible' })
   * @returns A Promise resolving when the indicator is hidden.
   */
  waitForLoadingIndicatorHidden: () => ReturnType<Page['waitForSelector']>;
  /**
   * Presses a key until the element with the css selector is in focus. If multiple elements match it will
   * press the key until the first occurrence of the element is focused.
   * @param selector - The css selector for the element.
   * @param key The key to press for keyboard navigation. Corresponds with the playwright keyboard api https://playwright.dev/docs/api/class-keyboard.
   * @param maxElementsToTraverse The maximum number of times the key will be pressed before throwing an error. Defaults to 1000.
   * @returns A Promise that resolves once the the element with the css selector is focused, or an error occurs.
   */
  keyTo: (selector: string, key: string, maxElementsToTraverse?: number) => Promise<void>;

  /**
   * Performs an accessibility (a11y) scan of the current page using axe-core.
   * Use this in tests to collect formatted violation summaries (one string per violation).
   *
   * @param options - Optional accessibility scan configuration (e.g. selectors to include, exclude, timeout).
   * @returns A Promise resolving to an object with a 'violations' array containing
   *          human-readable formatted strings for each detected violation (empty if none).
   */
  checkA11y: (options?: RunA11yScanOptions) => Promise<{
    violations: string[];
  }>;

  /**
   * Types text into an input field character by character with a specified delay between each character.
   * @param selector - The css selector for the input element.
   * @param text - The text to type into the input field.
   * @param options - Optional configuration object.
   * @param options.delay - The delay in milliseconds between typing each character (default: 25ms).
   * @returns A Promise that resolves once the text has been typed.
   */
  typeWithDelay: (selector: string, text: string, options?: { delay: number }) => Promise<void>;
  /**
   * Simplified API to interact with elements using Kibana's 'data-test-subj' attribute.
   */
  testSubj: {
    check: (selector: string, options?: Parameters<Page['check']>[1]) => ReturnType<Page['check']>;
    click: (selector: string, options?: Parameters<Page['click']>[1]) => ReturnType<Page['click']>;
    dblclick: (
      selector: string,
      options?: Parameters<Page['dblclick']>[1]
    ) => ReturnType<Page['dblclick']>;
    fill: (
      selector: string,
      value: string,
      options?: Parameters<Page['fill']>[2]
    ) => ReturnType<Page['fill']>;
    focus: (selector: string, options?: Parameters<Page['focus']>[1]) => ReturnType<Page['focus']>;
    getAttribute: (
      selector: string,
      name: string,
      options?: Parameters<Page['getAttribute']>[2]
    ) => ReturnType<Page['getAttribute']>;
    hover: (selector: string, options?: Parameters<Page['hover']>[1]) => ReturnType<Page['hover']>;
    innerText: (
      selector: string,
      options?: Parameters<Page['innerText']>[1]
    ) => ReturnType<Page['innerText']>;
    isEnabled: (
      selector: string,
      options?: Parameters<Page['isEnabled']>[1]
    ) => ReturnType<Page['isEnabled']>;
    isChecked: (
      selector: string,
      options?: Parameters<Page['isChecked']>[1]
    ) => ReturnType<Page['isChecked']>;
    isHidden: (
      selector: string,
      options?: Parameters<Page['isHidden']>[1]
    ) => ReturnType<Page['isHidden']>;
    isVisible: (
      selector: string,
      options?: Parameters<Page['isVisible']>[1]
    ) => ReturnType<Page['isVisible']>;
    locator: (
      selector: string,
      options?: Parameters<Page['locator']>[1]
    ) => ReturnType<Page['locator']>;
    waitForSelector: (
      selector: string,
      options?: Parameters<Page['waitForSelector']>[1]
    ) => ReturnType<Page['waitForSelector']>;
    // custom methods
    /**
     * Types text into an input field character by character with a specified delay between each character.
     *
     * @param selector - The selector for the input element (supports 'data-test-subj' attributes).
     * @param text - The text to type into the input field.
     * @param options - Optional configuration object.
     * @param options.delay - The delay in milliseconds between typing each character (default: 25ms).
     * @returns A Promise that resolves once the text has been typed.
     */
    typeWithDelay: (selector: string, text: string, options?: { delay: number }) => Promise<void>;
    /**
     * Clears the input field by filling it with an empty string.
     * @param selector The selector for the input element (supports 'data-test-subj' attributes).
     * @returns A Promise that resolves once the text has been cleared.
     */
    clearInput: (selector: string) => Promise<void>;
    /**
     * Drags an element with the source selector to the element with the target selector.
     * @param sourceSelector The selector for the source element to drag (supports 'data-test-subj' attributes).
     * @param targetSelector The selector for the target element to drop onto (supports 'data-test-subj' attributes).
     * @returns A Promise that resolves once the drag operation is complete.
     */
    dragTo: (sourceSelector: string, targetSelector: string) => Promise<void>;
  };
};

export { scoutPageParallelFixture } from './parallel';
export { scoutPageFixture } from './single_thread';
