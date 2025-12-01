/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen, within, fireEvent } from '@testing-library/react';

export class EuiSuperSelectTestHarness {
  #testId: string;

  /**
   * Returns super select container or throws
   */
  get #containerEl() {
    return screen.getByTestId(this.#testId);
  }

  /**
   * Returns the button element that opens the dropdown
   */
  get #buttonEl() {
    return within(this.#containerEl).getByRole('button');
  }

  constructor(testId: string) {
    this.#testId = testId;
  }

  /**
   * Returns `data-test-subj` of super select
   */
  public get testId() {
    return this.#testId;
  }

  /**
   * Returns super select container if found, otherwise `null`
   */
  public get self() {
    return screen.queryByTestId(this.#testId);
  }

  /**
   * Returns the currently selected option's display text
   */
  public get selectedOption(): string {
    return this.#buttonEl.textContent || '';
  }

  /**
   * Select an option by opening the dropdown and clicking the option
   *
   * @param optionTestSubj - The data-test-subj of the option to select
   */
  public async selectOption(optionTestSubj: string) {
    // Open dropdown
    fireEvent.click(this.#buttonEl);

    // Wait for option to appear and click it
    const option = await screen.findByTestId(optionTestSubj);
    fireEvent.click(option);
  }
}
