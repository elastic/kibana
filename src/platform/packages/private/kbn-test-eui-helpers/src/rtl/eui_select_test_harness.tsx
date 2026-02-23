/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen, within, fireEvent } from '@testing-library/react';

export class EuiSelectTestHarness {
  #testId: string;

  constructor(testId: string) {
    this.#testId = testId;
  }

  /**
   * Returns `data-test-subj` of select
   */
  public get testId() {
    return this.#testId;
  }

  /**
   * Returns select element if found, otherwise `null`.
   */
  public getElement(): HTMLElement | null {
    return screen.queryByTestId(this.#testId);
  }

  /**
   * Returns all options of select.
   * Returns empty array if select is not found.
   */
  public getOptions(): HTMLOptionElement[] {
    const el = this.getElement();
    if (!el) return [];
    return within(el).getAllByRole('option');
  }

  /**
   * Returns selected option value.
   * Returns empty string if select is not found.
   */
  public getSelected(): string {
    const el = this.getElement();
    if (!el) return '';
    return (el as HTMLSelectElement).value;
  }

  /**
   * Select option by value
   */
  public select(optionName: string | RegExp) {
    const el = this.getElement();
    if (!el) {
      throw new Error(`Expected select "${this.#testId}" to exist`);
    }

    const matches = (re: RegExp, value: string) => {
      // Avoid surprising behavior for global regexes (`/foo/g`) by resetting state.
      re.lastIndex = 0;
      return re.test(value);
    };

    const option = this.getOptions().find((o) => {
      if (typeof optionName === 'string') return o.value === optionName;

      const text = o.textContent ?? '';
      return matches(optionName, o.value) || matches(optionName, text);
    });

    if (!option) {
      throw new Error(`Option [${optionName}] not found`);
    }

    fireEvent.change(el, { target: { value: option.value } });
  }
}
