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

  /**
   * Returns button group or throws
   */
  get #buttonGroup() {
    return screen.getByTestId(this.#testId);
  }

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
   * Returns button group if found, otherwise `null`
   */
  public get self() {
    return screen.queryByTestId(this.#testId);
  }

  /**
   * Returns all options of button groups
   */
  public get options() {
    return within(this.#buttonGroup).getAllByRole('button');
  }

  /**
   * Returns selected option of button group
   */
  public get selected() {
    return within(this.#buttonGroup).getByRole('button', { pressed: true });
  }

  /**
   * Select option from group
   */
  public select(optionName: string | RegExp) {
    const option = within(this.#buttonGroup).getByRole('button', { name: optionName });
    fireEvent.click(option);
  }
}
