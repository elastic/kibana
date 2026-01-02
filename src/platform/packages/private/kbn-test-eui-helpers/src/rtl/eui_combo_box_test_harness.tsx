/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen, within, fireEvent, waitFor } from '@testing-library/react';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
   * Returns combobox container if found, otherwise `null`.
   */
  public getElement(): HTMLElement | null {
    return screen.queryByTestId(this.#testId);
  }

  /**
   * Returns selected values as array of strings.
   *
   * Reads from pills with `data-test-subj="euiComboBoxPill"`.
   * Returns empty array if combobox is not found.
   */
  public getSelected(): string[] {
    const el = this.getElement();
    if (!el) return [];
    const pills = within(el).queryAllByTestId('euiComboBoxPill');
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
  public select(label: string) {
    const input = this.#inputEl;
    fireEvent.change(input, { target: { value: label } });
    fireEvent.keyDown(input, { key: 'Enter' });
  }

  public async selectAsync(searchText: string) {
    const input = this.#inputEl;

    // Focus and click to open dropdown (or re-open if closed from previous selection)
    fireEvent.focus(input);
    fireEvent.click(input);

    // Type the search text - this triggers async onSearchChange
    fireEvent.change(input, { target: { value: searchText } });

    // Wait for async onSearchChange to complete and options to appear
    await waitFor(() => {
      // EUI adds space-separated test subjects: "comboBoxOptionsList ${testId}-optionsList"
      // Use a RegExp test id matcher so we can match within the space-separated value.
      const optionsList = screen.queryByTestId(
        new RegExp(`${escapeRegExp(this.#testId)}-optionsList`)
      );

      if (!optionsList) {
        throw new Error(`Options list did not appear for search: "${searchText}"`);
      }

      const options = within(optionsList).queryAllByRole('option');

      if (options.length === 0) {
        throw new Error(`No options found in list for search: "${searchText}"`);
      }
    });

    // Click the matching option (avoid "first item wins")
    const optionsList = screen.queryByTestId(
      new RegExp(`${escapeRegExp(this.#testId)}-optionsList`)
    );
    if (optionsList) {
      const option = within(optionsList).queryByText(searchText);
      if (option) {
        fireEvent.click(option);

        // Wait for selection to propagate
        await waitFor(() => {
          const selected = this.getSelected();
          if (!selected.includes(searchText)) {
            throw new Error(
              `Selection did not propagate for: "${searchText}". Current: ${JSON.stringify(
                selected
              )}`
            );
          }
        });
      } else {
        throw new Error(`No option text matched: "${searchText}"`);
      }
    }
  }

  /**
   * Clear all selected options by clicking the clear button
   */
  public clear() {
    const el = this.getElement();
    if (!el) return;
    const clearButton = within(el).queryByTestId('comboBoxClearButton');
    if (clearButton) {
      fireEvent.click(clearButton);
    }
  }
}
