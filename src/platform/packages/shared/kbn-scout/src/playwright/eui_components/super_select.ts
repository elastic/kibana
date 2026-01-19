/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  public readonly valueInputLocator: Locator;

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

    this.valueInputLocator = this.superSelectControlWrapper.locator('input[type="hidden"]');

    // EuiSuperSelect renders a button element that acts as the toggle
    // The initial locator should be the button, but also find it within wrapper as fallback
    this.button = initialLocator.or(
      this.superSelectControlWrapper.locator('button.euiSuperSelectControl')
    );

    // The dropdown is a listbox that only appears when the button is clicked (opened)
    this.dropdown = this.page.locator('[role="listbox"]');
  }

  toggleDropdown = async (): Promise<void> => {
    await this.button.click();
  };

  getIsDropdownOpened = async (): Promise<boolean> => {
    const classes = await this.button.getAttribute('class');

    return classes?.includes('-open') || false;
  };

  /**
   * Select an option by its value or test-subj identifier.
   * @param value - The value to select, or a test-subj identifier like "option-type-ip"
   * @throws Error if the super select is disabled
   */
  async selectOption(value: string): Promise<void> {
    if (await this.isDisabled()) {
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
    await this.dropdown.waitFor({ state: 'detached' });
    if (isToggled) {
      await this.toggleDropdown();
    }
  }

  /**
   * Check if the super select is disabled
   */
  async isDisabled(): Promise<boolean> {
    return await this.button.isDisabled();
  }
}
