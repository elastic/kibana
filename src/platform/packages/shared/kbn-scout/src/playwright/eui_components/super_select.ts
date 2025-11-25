/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v 1"; you may not use this file
 * except in compliance with, at your election, the "Elastic License 2.0" or the
 * "GNU Affero General Public License v 1".
 */

import type { Locator } from '@playwright/test';
import type { ScoutPage } from '../fixtures/scope/test/scout_page';
import { resolveSelector, type SelectorInput } from '../utils';

// https://eui.elastic.co/docs/components/forms/selection/super-select/
export class EuiSuperSelectWrapper {
  private readonly page: ScoutPage;
  private readonly superSelectControlWrapper: Locator;
  private readonly button: Locator;
  private readonly dropdown: Locator;
  private readonly selectedOption: Locator;

  /**
   * Create a new EuiSuperSelectWrapper instance.
   * new EuiSuperSelectWrapper(page, { dataTestSubj: 'mySuperSelect' })
   * new EuiSuperSelectWrapper(page, 'mySuperSelect') // backward compatibility
   * new EuiSuperSelectWrapper(page, { locator: '.euiSuperSelect' })
   */
  constructor(page: ScoutPage, selector: SelectorInput) {
    this.page = page;
    const initialLocator = resolveSelector(page, selector);

    // .euiSuperSelect is the main wrapper class.
    this.superSelectControlWrapper = page
      .locator('.euiSuperSelect')
      .filter({ has: initialLocator });

    // EuiSuperSelect renders a button element that acts as the toggle
    // The initial locator should be the button, but also find it within wrapper as fallback
    this.button = initialLocator.or(
      this.superSelectControlWrapper.locator('button.euiSuperSelectControl')
    );

    // The dropdown is a listbox that only appears when the button is clicked (opened)
    this.dropdown = this.page.locator('[role="listbox"]');

    // role="option" with aria-selected="true" indicates the selected option
    this.selectedOption = this.dropdown.locator('[role="option"][aria-selected="true"]');
  }

  toggleDropdown = async (): Promise<void> => {
    await this.button.waitFor({ state: 'attached' });
    await this.button.click();
  };

  getIsDropdownOpened = async (): Promise<boolean> => {
    await this.button.waitFor({ state: 'attached' });
    const classes = await this.button.getAttribute('class');

    return classes?.includes('-open') || false;
  };

  /**
   * Get the selected value from the super select.
   * This extracts the actual value, not the display text.
   * EuiSuperSelect stores the selected value in a hidden input element.
   */
  async getSelectedValue(): Promise<string> {
    await this.superSelectControlWrapper.waitFor({ state: 'attached' });
    const hiddenInput = this.superSelectControlWrapper.locator('input[type="hidden"]');
    const inputExists = (await hiddenInput.count()) > 0;

    if (inputExists) {
      const value = await hiddenInput.getAttribute('value');
      if (value) {
        return value;
      }
    }

    // Fallback: extract the value from the id of the selected option
    let isToggled = false;
    if (!(await this.getIsDropdownOpened())) {
      await this.toggleDropdown();
      isToggled = true;
    }

    const selectedOptionExists = (await this.selectedOption.count()) > 0;
    if (selectedOptionExists) {
      const optionId = await this.selectedOption.getAttribute('id');
      if (optionId) {
        return optionId;
      }
    }

    if (isToggled) {
      await this.toggleDropdown();
    }

    // Return empty string if nothing found
    return '';
  }

  /**
   * Select an option by its value or test-subj identifier.
   * @param value - The value to select, or a test-subj identifier like "option-type-ip"
   * @throws Error if the super select is disabled
   */
  async selectOption(value: string): Promise<void> {
    await this.superSelectControlWrapper.waitFor({ state: 'attached' });
    await this.button.waitFor({ state: 'attached' });

    // Check if disabled before attempting to select
    const disabled = await this.isDisabled();
    if (disabled) {
      throw new Error('Cannot select option: super select is disabled');
    }

    let isToggled = false;
    if (!(await this.getIsDropdownOpened())) {
      await this.toggleDropdown();
      isToggled = true;
    }

    // Find the option in the list box with id="value" or data-test-subj="option-type-${value}"
    const optionById = this.dropdown.locator(`[role="option"][id="${value}"]`);
    const optionByTestSubj = this.dropdown.locator(
      `[role="option"][data-test-subj="option-type-${value}"]`
    );

    if ((await optionById.count()) > 0) {
      await optionById.click();
    } else if ((await optionByTestSubj.count()) > 0) {
      await optionByTestSubj.click();
    } else {
      throw new Error(`Could not find option with value "${value}" in Eui Super Select`);
    }

    // Wait for dropdown to close
    await this.page.waitForTimeout(100); // slight delay to allow UI to update
    if (isToggled) {
      await this.toggleDropdown();
    }
  }

  /**
   * Check if the super select is disabled
   */
  async isDisabled(): Promise<boolean> {
    await this.button.waitFor({ state: 'attached' });
    return await this.button.isDisabled();
  }
}
