/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen, within, fireEvent, waitFor } from '@testing-library/react';

export class EuiComboBoxTestHarness {
  #testId: string;

  /**
   * Returns combobox container or throws
   */
  get #containerEl() {
    return screen.getByTestId(this.#testId);
  }

  /**
   * Returns the input element (role="combobox")
   * Finds it within or near the container
   */
  get #inputEl() {
    const container = this.#containerEl;
    // Try within container first
    const inputWithin = within(container).queryByRole('combobox');
    if (inputWithin) return inputWithin;

    // Try in parent
    const parent = container.parentElement;
    if (parent) {
      const inputInParent = within(parent).queryByRole('combobox');
      if (inputInParent) return inputInParent;
    }

    throw new Error(`Could not find combobox input for testId: ${this.#testId}`);
  }

  constructor(testId: string) {
    this.#testId = testId;
  }

  /**
   * Returns `data-test-subj` of combobox
   */
  public get testId() {
    return this.#testId;
  }

  /**
   * Returns combobox container if found, otherwise `null`
   */
  public get self() {
    return screen.queryByTestId(this.#testId);
  }

  /**
   * Returns selected values as array of strings
   * Reads from pills with data-test-subj="euiComboBoxPill"
   */
  public get selectedOptions(): string[] {
    const pills = within(this.#containerEl).queryAllByTestId('euiComboBoxPill');
    return pills.map((pill) => pill.textContent || '');
  }

  /**
   * Select an option by typing its label and pressing Enter
   *
   * IMPORTANT: Must use the exact display label, not the internal value
   * Example: Use 'Semantic text' not 'semantic_text'
   *
   * @param label - The display label of the option to select
   */
  public selectOption(label: string) {
    const input = this.#inputEl;
    fireEvent.change(input, { target: { value: label } });
    fireEvent.keyDown(input, { key: 'Enter' });
  }

  public async selectOptionAsync(searchText: string) {
    const input = this.#inputEl;

    // Focus and click to open dropdown (or re-open if closed from previous selection)
    // Pattern 8: fireEvent over userEvent for performance - no act() wrapping
    fireEvent.focus(input);
    fireEvent.click(input);

    // Type the search text - this triggers async onSearchChange
    fireEvent.change(input, { target: { value: searchText } });

    // Wait for async onSearchChange to complete and options to appear
    // Pattern 4: Use waitFor for async waiting, no manual act() wrapping
    await waitFor(() => {
      // EUI adds space-separated test subjects: "comboBoxOptionsList ${testId}-optionsList"
      // screen.queryByTestId does exact attribute match, which won't work with space-separated values
      // Use querySelector with *= (contains) instead
      const optionsList = document.querySelector(
        `[data-test-subj*="${this.#testId}-optionsList"]`
      ) as HTMLElement | null;

      if (!optionsList) {
        throw new Error(`Options list did not appear for search: "${searchText}"`);
      }

      const options = within(optionsList).queryAllByRole('option');

      if (options.length === 0) {
        throw new Error(`No options found in list for search: "${searchText}"`);
      }
    });

    // Click the first option - Pattern 8: direct fireEvent
    const optionsList = document.querySelector(
      `[data-test-subj*="${this.#testId}-optionsList"]`
    ) as HTMLElement | null;
    if (optionsList) {
      const options = within(optionsList).queryAllByRole('option');
      if (options[0]) {
        fireEvent.click(options[0]);

        // Wait for selection to propagate - Pattern 4: waitFor over manual timers
        await waitFor(() => {
          const selected = this.selectedOptions;
          if (!selected.includes(searchText)) {
            throw new Error(
              `Selection did not propagate for: "${searchText}". Current: ${JSON.stringify(
                selected
              )}`
            );
          }
        });
      }
    }
  }

  /**
   * Clear all selected options by clicking the clear button
   */
  public clearSelection() {
    const clearButton = within(this.#containerEl).queryByTestId('comboBoxClearButton');
    if (clearButton) {
      fireEvent.click(clearButton);
    }
  }
}
