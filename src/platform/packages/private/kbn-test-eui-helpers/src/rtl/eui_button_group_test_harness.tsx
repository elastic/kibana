/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen, within, fireEvent } from '@testing-library/react';

export class EuiButtonGroupTestHarness {
  #testId: string;

  constructor(testId: string) {
    this.#testId = testId;
  }

  /**
   * Returns `data-test-subj` of button group
   */
  public get testId() {
    return this.#testId;
  }

  /**
   * Returns button group element if found, otherwise `null`.
   */
  public getElement(): HTMLElement | null {
    return screen.queryByTestId(this.#testId);
  }

  /**
   * Returns all options of button groups.
   * Returns empty array if button group is not found.
   */
  public getOptions(): HTMLButtonElement[] {
    const el = this.getElement();
    if (!el) return [];
    return within(el).getAllByRole('button');
  }

  /**
   * Returns selected option of button group, or `null` if none is selected or button group is not found.
   */
  public getSelected(): HTMLButtonElement | null {
    const el = this.getElement();
    if (!el) return null;
    return within(el).queryByRole('button', { pressed: true });
  }

  /**
   * Select option from group
   */
  public select(optionName: string | RegExp) {
    const el = this.getElement();
    if (!el) {
      throw new Error(`Expected button group "${this.#testId}" to exist`);
    }
    const option = within(el).queryByRole('button', { name: optionName });
    if (!option) {
      throw new Error(`Expected button group option "${String(optionName)}" to exist`);
    }
    fireEvent.click(option);
  }
}
