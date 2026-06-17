/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';

const mockToBeVisible = jest.fn().mockResolvedValue(undefined);
const mockPlaywrightExpect = jest.fn((_value?: unknown) => ({
  toBeVisible: mockToBeVisible,
}));

jest.mock('@playwright/test', () => ({
  expect: (value: unknown) => mockPlaywrightExpect(value),
}));

import { scrollContainerUntilTargetIsVisible } from './scroll_container_until_target_is_visible';

describe('scrollContainerUntilTargetIsVisible', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createScrollContainer = (evaluateResults: Array<boolean | void>) => {
    let index = 0;
    return {
      evaluate: jest.fn().mockImplementation(async () => {
        const result = evaluateResults[index];
        index += 1;
        return result;
      }),
    } as unknown as Locator;
  };

  const createTarget = (visibleStates: boolean[]) => {
    let index = 0;
    return {
      isVisible: jest.fn().mockImplementation(async () => {
        const value = visibleStates[index] ?? visibleStates[visibleStates.length - 1];
        index += 1;
        return value;
      }),
    } as unknown as Locator;
  };

  it('resets to top and stops when target becomes visible', async () => {
    const scrollContainer = createScrollContainer([undefined, false, false]);
    const target = createTarget([false, false, true]);

    await scrollContainerUntilTargetIsVisible({
      scrollContainer,
      target,
      maxScrollSteps: 10,
      scrollStepPx: 150,
    });

    expect(scrollContainer.evaluate).toHaveBeenCalledTimes(3);
    expect(target.isVisible).toHaveBeenCalledTimes(3);
    expect(mockToBeVisible).toHaveBeenCalledTimes(1);
    expect(mockPlaywrightExpect).toHaveBeenCalledWith(scrollContainer);
  });

  it('does not reset to top when startFromTop is false', async () => {
    const scrollContainer = createScrollContainer([false]);
    const target = createTarget([false, true]);

    await scrollContainerUntilTargetIsVisible({
      scrollContainer,
      target,
      startFromTop: false,
      maxScrollSteps: 10,
    });

    expect(scrollContainer.evaluate).toHaveBeenCalledTimes(1);
    expect(target.isVisible).toHaveBeenCalledTimes(2);
    expect(mockToBeVisible).toHaveBeenCalledTimes(1);
    expect(mockPlaywrightExpect).toHaveBeenCalledWith(scrollContainer);
  });
});
