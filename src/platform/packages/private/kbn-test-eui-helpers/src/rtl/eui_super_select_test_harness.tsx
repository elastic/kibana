/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen, within, fireEvent, waitForElementToBeRemoved } from '@testing-library/react';

export class EuiSuperSelectTestHarness {
  #testId: string;
  #container?: HTMLElement;

  #query = () => {
    return this.#container ? within(this.#container) : screen;
  };

  #resolveElementFromMatches(matches: HTMLElement[]) {
    if (matches.length === 1) {
      return matches[0];
    }

    // Prefer the element that actually contains the SuperSelect control (button that opens listbox).
    const superSelectCandidates = matches.filter((el) => {
      if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') return true;
      return el.querySelector('button[aria-haspopup="listbox"]') !== null;
    });

    if (superSelectCandidates.length === 1) {
      return superSelectCandidates[0];
    }

    throw new Error(
      `EuiSuperSelectTestHarness: found multiple elements for data-test-subj="${this.#testId}". ` +
        `Pass a container to scope the query, or ensure the test id is unique.`
    );
  }

  /**
   * Returns super select container or throws
   */
  get #containerEl() {
    const matches = this.#query().getAllByTestId(this.#testId) as HTMLElement[];
    return this.#resolveElementFromMatches(matches);
  }

  /**
   * Returns the button element that opens the dropdown.
   *
   * Note: depending on how `data-test-subj` is applied, the element returned by
   * `getByTestId()` may itself be the `<button>` control (not a wrapper). In
   * that case `within(container).getByRole('button')` would fail because the
   * container has no descendants.
   */
  get #buttonEl() {
    const el = this.#containerEl;

    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
      return el;
    }

    return within(el).getByRole('button');
  }

  constructor(testId: string, options?: { container?: HTMLElement }) {
    this.#testId = testId;
    this.#container = options?.container;
  }

  /**
   * Returns `data-test-subj` of super select
   */
  public get testId() {
    return this.#testId;
  }

  /**
   * Returns super select element if found, otherwise `null`.
   */
  public getElement(): HTMLElement | null {
    const matches = this.#query().queryAllByTestId(this.#testId) as HTMLElement[];
    if (matches.length === 0) return null;
    return this.#resolveElementFromMatches(matches);
  }

  /**
   * Preferred alias for selected option.
   * Returns empty string if super select is not found.
   */
  public getSelected(): string {
    const el = this.getElement();
    if (!el) return '';
    // Check if element itself is a button
    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
      return el.textContent || '';
    }
    // Otherwise find button within
    const button = within(el).queryByRole('button');
    return button?.textContent || '';
  }

  /**
   * Select an option by opening the dropdown and clicking the option
   *
   * @param optionTestSubj - The data-test-subj of the option to select
   */
  public async select(
    optionTestSubj: string,
    options?: {
      /**
       * If multiple options match the same `data-test-subj`, set this to true and use `index`
       * to select a specific option.
       */
      allowMultiple?: boolean;
      /** Which matching option to click (defaults to 0). Only used when allowMultiple is true. */
      index?: number;
    }
  ) {
    // Open dropdown
    fireEvent.click(this.#buttonEl);
    const listbox = await screen.findByRole('listbox');

    // Wait for option(s) to appear
    const matches = await within(listbox).findAllByTestId(optionTestSubj);

    if (matches.length > 1 && !options?.allowMultiple) {
      throw new Error(
        `EuiSuperSelectTestHarness: found multiple options for data-test-subj="${optionTestSubj}". ` +
          `Pass { allowMultiple: true, index } to select deterministically.`
      );
    }

    const index = options?.index ?? 0;
    const option = matches[index];

    if (!option) {
      throw new Error(
        `EuiSuperSelectTestHarness: option index ${index} not found for data-test-subj="${optionTestSubj}".`
      );
    }

    fireEvent.click(option);

    // Ensure the dropdown is closed before continuing (prevents race conditions)
    await waitForElementToBeRemoved(listbox);
  }

  /**
   * Select an option by its DOM id (EUI often sets `id` on options to the option value).
   *
   * Useful when options don't have stable/unique `data-test-subj`.
   */
  public async selectById(optionId: string) {
    fireEvent.click(this.#buttonEl);
    const listbox = await screen.findByRole('listbox');

    // Scope the id lookup to the open listbox to avoid accidentally targeting unrelated elements
    // elsewhere in the document.
    const option = listbox.querySelector<HTMLElement>(`#${CSS.escape(optionId)}`);
    if (!option) {
      throw new Error(
        `EuiSuperSelectTestHarness: option element not found with id="${optionId}" inside the listbox.`
      );
    }

    fireEvent.click(option);

    await waitForElementToBeRemoved(listbox);
  }
}
