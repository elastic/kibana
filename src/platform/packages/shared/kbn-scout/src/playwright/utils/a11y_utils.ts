/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Page } from '@playwright/test';

const keyToElement = async (
  page: Page,
  selector: string,
  key: string,
  maxElementsToTraverse: number,
  numVisitedElements: number
): Promise<void> => {
  await page.keyboard.press(key);

  if (numVisitedElements >= maxElementsToTraverse)
    throw new Error(
      `${key} key pressed ${numVisitedElements} times without the element with selector ${selector} being focused. Max elements for keyTo to traverse is set to ${maxElementsToTraverse}.`
    );

  const isTargetFocused = await page.evaluate(
    ({ targetSelector }) => {
      const targetElement = document.querySelector(targetSelector);
      const focused = document.activeElement;
      return focused === targetElement;
    },
    { targetSelector: selector }
  );

  if (!isTargetFocused)
    return keyToElement(page, selector, key, maxElementsToTraverse, numVisitedElements + 1);
};

export const keyTo = async (
  page: Page,
  selector: string,
  key: string,
  maxElementsToTraverse: number
): Promise<void> => {
  await keyToElement(page, selector, key, maxElementsToTraverse, 0);
};
