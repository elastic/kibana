/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Page } from '@playwright/test';

// selector should be on the page and match at least
const verifyValidSelector = async (selector: string, page: Page): Promise<void> => {
  const matchingElements = await page.locator(selector).count();
  if (matchingElements === 0) throw new Error(`No elements found with selector: ${selector}`);
};

const keyToElement = async (
  page: Page,
  selector: string,
  key: string = 'Tab',
  visited: Set<string> = new Set()
): Promise<void> => {
  await page.keyboard.press(key);
  await page.screenshot();

  const focusedOuterHTML = await page.evaluate(() => {
    const focused = document.activeElement;
    if (!focused) throw new Error('No focusable elements found on the page.');
    return focused.outerHTML;
  });
  if (visited.has(focusedOuterHTML))
    throw new Error(
      `A cycle was detected with key ${key} before finding element with selector: ${selector}`
    );
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

export const keyTo = async (page: Page, selector: string, key: string = 'Tab'): Promise<void> => {
  await verifyValidSelector(selector, page);
  await keyToElement(page, selector, key);
};
