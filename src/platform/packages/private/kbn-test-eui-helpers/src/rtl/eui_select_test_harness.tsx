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

  /**
   * Returns select or throws
   */
  get #selectEl() {
    return screen.getByTestId(this.#testId);
  }

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
   * Returns button select if found, otherwise `null`
   */
  public get self() {
    return screen.queryByTestId(this.#testId);
  }

  /**
   * Returns all options of select
   */
  public get options(): HTMLOptionElement[] {
    return within(this.#selectEl).getAllByRole('option');
  }

  /**
   * Returns selected option
   */
  public get selected() {
    return (this.#selectEl as HTMLSelectElement).value;
  }

  /**
   * Select option by value
   */
  public select(optionName: string | RegExp) {
    const option = this.options.find((o) => o.value === optionName)?.value;

    if (!option) {
      throw new Error(`Option [${optionName}] not found`);
    }

    fireEvent.change(this.#selectEl, { target: { value: option } });
  }
}
