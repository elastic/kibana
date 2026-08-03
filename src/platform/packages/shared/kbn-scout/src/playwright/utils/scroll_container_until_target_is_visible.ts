/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

interface ScrollContainerUntilTargetIsVisibleParams {
  scrollContainer: Locator;
  target: Locator;
  maxScrollSteps?: number;
  scrollStepPx?: number;
  startFromTop?: boolean;
}

/**
 * Scroll a container until a virtualized target element is rendered and visible.
 */
export const scrollContainerUntilTargetIsVisible = async ({
  scrollContainer,
  target,
  maxScrollSteps = 40,
  scrollStepPx = 1_200,
  startFromTop = true,
}: ScrollContainerUntilTargetIsVisibleParams) => {
  await expect(scrollContainer).toBeVisible();

  if (startFromTop) {
    await scrollContainer.evaluate((el) => {
      el.scrollTop = 0;
    });
  }

  for (let i = 0; i < maxScrollSteps; i++) {
    if (await target.isVisible()) {
      return;
    }

    const reachedBottom = await scrollContainer.evaluate((el, step) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atBottom = scrollTop + clientHeight >= scrollHeight;
      if (atBottom) {
        return true;
      }

      el.scrollBy(0, step);
      return false;
    }, scrollStepPx);

    if (reachedBottom) {
      break;
    }
  }

  await expect(target).toBeVisible();
};
