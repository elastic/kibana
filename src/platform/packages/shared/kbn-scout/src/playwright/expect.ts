/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type ExpectMatcherState,
  type Locator,
  type MatcherReturnType,
  expect,
} from '@playwright/test';

declare global {
  /* eslint-disable-next-line @typescript-eslint/no-namespace */
  namespace PlaywrightTest {
    interface Matchers<R> {
      toBeEuiDisabled(): Promise<R>;
    }
  }
}

const customMatchers = {
  async toBeEuiDisabled(_this: ExpectMatcherState, locator: Locator): Promise<MatcherReturnType> {
    const assertionName = 'toBeEuiDisabled';

    try {
      // Check multiple ways an element can be disabled to handle EUI components
      // Use the locator directly - it should already target the specific element

      // Get both disabled attribute and aria-disabled
      const [isDisabledAttr, ariaDisabled, isInputDisabled] = await Promise.all([
        locator.getAttribute('disabled').catch(() => null),
        locator.getAttribute('aria-disabled').catch(() => null),
        locator.isDisabled().catch(() => false),
      ]);

      // Element is considered disabled if:
      // 1. Has disabled attribute (even if empty string)
      // 2. Has aria-disabled="true"
      // 3. Playwright's isDisabled() returns true
      const isDisabled = isDisabledAttr !== null || ariaDisabled === 'true' || isInputDisabled;

      const pass = isDisabled;

      return {
        name: assertionName,
        expected: true,
        actual: isDisabled,
        message: () => {
          const hint = _this.utils.matcherHint(assertionName, undefined, undefined, {
            isNot: _this.isNot,
          });

          const expectedText = _this.isNot ? 'not to be disabled' : 'to be disabled';
          const actualText = isDisabled ? 'disabled' : 'enabled';

          const details = [
            `disabled attribute: ${isDisabledAttr !== null ? `"${isDisabledAttr}"` : 'null'}`,
            `aria-disabled: ${ariaDisabled || 'null'}`,
            `isDisabled(): ${isInputDisabled}`,
          ].join('\n  ');

          return `${hint}\n\nExpected element ${expectedText}\nActual: ${actualText}\n\nElement state:\n  ${details}`;
        },
        pass,
      };
    } catch (error) {
      return {
        name: assertionName,
        expected: true,
        actual: undefined,
        message: () => `Failed to check disabled state: ${error}`,
        pass: false,
      };
    }
  },
};

expect.extend(customMatchers);

export { expect };
