/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen, within } from '@testing-library/react';

export class FormErrorTestHarness {
  #scope?: string;

  constructor(scope?: string) {
    this.#scope = scope;
  }

  /**
   * Returns `data-test-subj` scope if provided
   */
  public get scope() {
    return this.#scope;
  }

  /**
   * Get all error messages currently visible in the form.
   * Searches for EUI form error text elements within the scope.
   */
  public get messages(): string[] {
    const container = this.#scope ? screen.getByTestId(this.#scope) : document.body;
    const errorTexts: string[] = [];

    // Method 1: Look for elements with role="alert"
    const alertElements = this.#scope
      ? within(container).queryAllByRole('alert')
      : screen.queryAllByRole('alert');

    alertElements.forEach((el) => {
      const texts = el.querySelectorAll('.euiFormErrorText');
      texts.forEach((text) => {
        const content = text.textContent?.trim();
        if (content) errorTexts.push(content);
      });
    });

    // Method 2: Look for .euiFormErrorText directly
    if (errorTexts.length === 0) {
      const errorElements = container.querySelectorAll('.euiFormErrorText');
      errorElements.forEach((el) => {
        const content = el.textContent?.trim();
        if (content) errorTexts.push(content);
      });
    }

    return errorTexts;
  }

  /**
   * Assert that specific error messages are displayed.
   */
  public expectMessages(expectedMessages: string[]) {
    expect(this.messages).toEqual(expectedMessages);
  }
}
