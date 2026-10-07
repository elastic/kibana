/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from 'playwright-core';
import type { ScoutPage } from '..';

interface OptionsListInteractionOptions {
  timeout?: number;
}

interface SelectOptionOptions extends OptionsListInteractionOptions {
  /**
   * When `true` (default), fills the search input before clicking the option so the list is
   * filtered to that option first. Pass `false` to click the option directly without filtering
   * (e.g. when the test needs to verify the full visible list before selecting).
   */
  search?: boolean;
}

/**
 * Interactions with the options-list control popover. Consumed as `controls.optionsList`.
 *
 * Readiness signal: `optionsList-control-available-options` — waits until suggestions have
 * loaded, not merely until the popover has mounted.
 *
 * Close mechanism: re-query and click the control toggle. The popover now unmounts
 * synchronously, so this avoids relying on focus-dependent Escape handling.
 */
export class OptionsListControl {
  /** Visible when the popover is open and options have loaded. */
  private readonly availableOptions: Locator;
  private openControlId?: string;

  constructor(private readonly page: ScoutPage) {
    this.availableOptions = this.page.testSubj.locator('optionsList-control-available-options');
  }

  /**
   * Opens the options-list popover for the given control and waits for options to load.
   */
  async openPopover(controlId: string, options?: OptionsListInteractionOptions): Promise<void> {
    await this.page.testSubj.locator(`optionsList-control-${controlId}`).click();
    await this.availableOptions.waitFor({ state: 'visible', timeout: options?.timeout });
    this.openControlId = controlId;
  }

  /**
   * Closes the options-list popover if it is open and waits for it to disappear.
   */
  async ensurePopoverIsClosed(options?: OptionsListInteractionOptions): Promise<void> {
    if (await this.availableOptions.isVisible()) {
      if (!this.openControlId) {
        throw new Error('Cannot close an options-list popover that was not opened by this helper');
      }
      await this.page.testSubj.locator(`optionsList-control-${this.openControlId}`).click();
      await this.availableOptions.waitFor({ state: 'hidden', timeout: options?.timeout });
    }
    this.openControlId = undefined;
  }

  /**
   * Fills the search input inside an open popover without selecting an option.
   * Useful when you want to assert the filtered list before committing to a selection.
   */
  async searchForOption(value: string): Promise<void> {
    await this.page.testSubj.locator('optionsList-control-search-input').fill(value);
  }

  /**
   * Selects an option from an already-open popover.
   *
   * By default (`search: true`) fills the search input first so the option is isolated before
   * clicking — a superset of clicking directly and safe for long lists. Pass
   * `{ search: false }` to click the option directly without filtering.
   */
  async selectOption(value: string, options?: SelectOptionOptions): Promise<void> {
    const { search = true, timeout } = options ?? {};
    if (search) {
      await this.page.testSubj.locator('optionsList-control-search-input').fill(value);
    }
    await this.page.testSubj.locator(`optionsList-control-selection-${value}`).click({ timeout });
  }

  /**
   * Returns the count of available options as reported by the `data-option-count` attribute
   * on the available-options container. Requires an open popover.
   */
  async getAvailableOptionsCount(): Promise<number> {
    return Number((await this.availableOptions.getAttribute('data-option-count')) ?? '0');
  }

  /**
   * Locator for the selected-options label of an options-list control, e.g. `AE` for a single
   * selection or `AE, CN` for multiple.
   */
  getSelectionsLocator(controlId: string): Locator {
    return this.page.testSubj
      .locator(`optionsList-control-${controlId}`)
      .getByTestId('optionsListSelections');
  }

  /**
   * Returns the selections label text for an options-list control. Falls back to the control
   * button's own inner text when no `optionsListSelections` element is present (e.g. when no
   * selection has been made and the control shows its placeholder).
   */
  async getSelectionsString(controlId: string): Promise<string> {
    const controlButton = this.page.testSubj.locator(`optionsList-control-${controlId}`);
    const selectionsEl = controlButton.getByTestId('optionsListSelections');
    const [selectionText = ''] = await selectionsEl.allInnerTexts();
    const buttonText = await controlButton.innerText();
    return (selectionText || buttonText).trim();
  }

  /**
   * Toggles the include/exclude mode for an open options-list popover.
   */
  async toggleExclude(): Promise<void> {
    await this.page.testSubj.locator('optionsList__excludeResults').click();
  }
}
