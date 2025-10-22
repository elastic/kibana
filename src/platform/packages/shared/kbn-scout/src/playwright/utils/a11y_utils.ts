/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Page } from '@playwright/test';

const verifyValidSelector = async (selector: string, page: Page): Promise<void> => {
  const target = page.locator(selector);
  // selector should be on the page and match exactly one element
  const matchingElements = await target.count();
  if (matchingElements === 0) throw new Error(`No elements found with selector: ${selector}`);
  if (matchingElements > 1)
    throw new Error(`${matchingElements} elements found with selector: ${selector}`);
};

/**
 * Presses a key until the element with the provided selector is in focus.
 * @param selector - The selector for the input element.
 * @param key The key to press for keyboard navigation, defaults to Tab if none specified. Corresponds with the playwright keyboard api https://playwright.dev/docs/api/class-keyboard.
 * @param visited A set of visited elements used internally within the function to prevent tab cycles.
 * @returns A Promise that resolves once the the element with the provided selector is focused, or an error occurs.
 */
const keyToElement = async (
  page: Page,
  selector: string,
  key: string = 'Tab',
  visited: Set<string> = new Set()
): Promise<void> => {
  await page.keyboard.press(key);
  await page.screenshot();

  /**
   * This is a bit hacky, we cannot keep track of a Set<Element> type as this takes us out of the node context and steps into
   * the browser, everything we pass back and forth needs to be serializable and Element types are not serializable. Outer html
   * is serializabe since it is just a string, it has the downside of possibly not being unique.
   */
  const focusedOuterHTML = await page.evaluate(() => {
    const focused = document.activeElement;
    if (!focused) throw new Error('No focusable elements found on the page.');
    return focused.outerHTML;
  });
  if (visited.has(focusedOuterHTML))
    throw new Error(`A cycle was detected before finding element with selector: ${selector}`);
  visited.add(focusedOuterHTML);

  const isTargetFocused = await page.evaluate(
    ({ targetSelector }) => {
      const targetElement = document.querySelector(targetSelector);
      const focused = document.activeElement;
      return focused === targetElement;
    },
    { targetSelector: selector }
  );

  if (!isTargetFocused) return keyToElement(page, selector, key, visited);
};

/**
 * Presses a key until the element with the provided selector is in focus.
 * @param page The playwright page object.
 * @param selector - The selector for the input element.
 * @param key The key to press for keyboard navigation, defaults to Tab if none specified. Corresponds with the playwright keyboard api https://playwright.dev/docs/api/class-keyboard.
 * @param visited A set of visited elements used internally within the function to prevent tab cycles.
 * @returns A Promise that resolves once the the element with the provided selector is focused, or an error occurs.
 */
export const keyTo = async (page: Page, selector: string, key: string = 'Tab'): Promise<void> => {
  await verifyValidSelector(selector, page);
  await keyToElement(page, selector, key);
};
