/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { subj } from '@kbn/test-subj-selector';
import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import type { ScoutPage } from '../fixtures/scope/test/scout_page';
import { resolveSelector, type SelectorInput } from '../utils';

// https://eui.elastic.co/docs/components/forms/selection/combo-box/
export class EuiComboBoxWrapper {
  private readonly page: ScoutPage;
  private readonly comboBoxWrapper: Locator;
  private readonly comboBoxMainInput: Locator;
  private readonly comboBoxSearchInput: Locator;
  private readonly comboBoxClearButton: Locator;
  private readonly comboBoxSelectedOptions: Locator;

  /**
   * Create a new EuiComboBoxWrapper instance.
   * new EuiComboBoxWrapper(page, { dataTestSubj: 'myComboBox' })
   * new EuiComboBoxWrapper(page, 'myComboBox') // backward compatibility
   * new EuiComboBoxWrapper(page, { locator: '.euiComboBox' })
   */
  constructor(page: ScoutPage, selector: SelectorInput) {
    this.page = page;
    this.comboBoxWrapper = resolveSelector(page, selector);

    this.comboBoxMainInput = this.comboBoxWrapper.locator(subj('comboBoxInput'));
    this.comboBoxSearchInput = this.comboBoxWrapper.locator(subj('comboBoxSearchInput'));
    this.comboBoxClearButton = this.comboBoxWrapper.locator(subj('comboBoxClearButton'));
    this.comboBoxSelectedOptions = this.comboBoxMainInput.locator('.euiComboBoxPill');
  }

  async getSelectedMultiOptions(): Promise<string[]> {
    await this.comboBoxWrapper.waitFor({ state: 'attached' });
    await this.comboBoxMainInput.waitFor({ state: 'attached' });

    const selectedOptions = await this.comboBoxSelectedOptions.allInnerTexts();
    return selectedOptions;
  }

  private async checkIfAlreadySelected(value: string) {
    const selectedOptions = await this.getSelectedMultiOptions();
    if (selectedOptions.includes(value)) {
      throw Error(`Value "${value}" is already selected in the comboBox`);
    }
  }

  private async waitForBadgeToBe(value: string, state: 'visible' | 'hidden') {
    await this.comboBoxWrapper
      .locator(`.euiBadge[title="${value}"]`)
      .waitFor({ state, timeout: 5000 });
  }

  private async verifySelectionAndClose(value: string) {
    const updatedOptions = await this.getSelectedMultiOptions();
    expect(updatedOptions).toContain(value);
    await this.page.keyboard.press('Escape');
  }

  private async typeValueInSearch(value: string) {
    await this.comboBoxSearchInput.pressSequentially(value, { delay: 50 });
  }

  async selectMultiOption(value: string) {
    await this.checkIfAlreadySelected(value);

    // put cursor in the comboBox input field
    await this.comboBoxMainInput.click();
    // type the value with a delay to allow for async option loading
    await this.typeValueInSearch(value);
    // select the option that matches the value
    const trimmedValue = value.trim();
    await this.page.locator(`.euiFilterSelectItem[title="${trimmedValue}"]`).click();
    // wait for the new badge to be visible
    await this.waitForBadgeToBe(value, 'visible');
    // Verify option was selected
    await this.verifySelectionAndClose(value);
  }

  async selectMultiOptions(values: string[]) {
    const selectedOptions = await this.getSelectedMultiOptions();

    // Check if any values are already selected before starting UI interactions
    const alreadySelected = values.filter((value) => selectedOptions.includes(value));
    if (alreadySelected.length > 0) {
      throw Error(`Values "${alreadySelected.join(', ')}" are already selected in the comboBox`);
    }

    await this.comboBoxMainInput.click();

    for (const value of values) {
      await this.typeValueInSearch(value);
      const trimmedValue = value.trim();
      await this.page.locator(`.euiFilterSelectItem[title="${trimmedValue}"]`).click();
      await this.waitForBadgeToBe(value, 'visible');
      const updatedOptions = await this.getSelectedMultiOptions();
      expect(updatedOptions).toContain(value);
    }

    await this.page.keyboard.press('Escape');
  }

  async setCustomMultiOption(value: string) {
    await this.checkIfAlreadySelected(value);

    await this.comboBoxMainInput.click();
    await this.typeValueInSearch(value);
    await this.page.keyboard.press('Enter');

    await this.waitForBadgeToBe(value, 'visible');
    // Verify option was selected
    const updatedOptions = await this.getSelectedMultiOptions();
    expect(updatedOptions).toContain(value);
  }

  async clear() {
    const inputValue = await this.getSelectedValue();
    const inputPillsCount = await this.comboBoxSelectedOptions.count();
    // multi-selection combobox input has no value, but only "pills", so we need to check both
    if (inputValue === '' && inputPillsCount === 0) {
      // no need to clean, it is empty
      return;
    }
    await this.comboBoxClearButton.click();
    await this.page.keyboard.press('Escape');
    // Wait for the input to be cleared with a timeout
    await expect(this.comboBoxSearchInput).toHaveValue('', { timeout: 5000 });
  }

  async removeOption(value: string) {
    const pills = await this.getSelectedMultiOptions();
    if (!pills.includes(value)) {
      throw Error(`Value "${value}" is not selected in the comboBox`);
    }
    // pill delete button
    await this.comboBoxWrapper.locator(`.euiBadge[title="${value}"]`).locator('button').click();
    await this.waitForBadgeToBe(value, 'hidden');
    expect(await this.getSelectedMultiOptions()).not.toContain(value);
  }

  // Select a single option in the comboBox
  async selectSingleOption(
    value: string,
    options: { optionTestSubj?: string; optionRoleName?: string } = {}
  ) {
    await this.clear();
    await this.comboBoxMainInput.click();
    await this.typeValueInSearch(value);
    // Prefer a specific test subj when option text is ambiguous.
    const optionLocator = options.optionTestSubj
      ? this.page.testSubj.locator(options.optionTestSubj)
      : this.page.getByRole('option', { name: options.optionRoleName ?? value, exact: false });
    await optionLocator.click();
    expect(await this.getSelectedValue()).toBe(value);
  }

  async setCustomSingleOption(value: string) {
    await this.clear();
    await this.comboBoxMainInput.click();
    await this.typeValueInSearch(value);
    await this.page.keyboard.press('Enter');
    expect(await this.getSelectedValue()).toBe(value);
  }

  async getSelectedValue() {
    return await this.comboBoxSearchInput.inputValue();
  }
}
