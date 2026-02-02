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

// https://eui.elastic.co/docs/components/forms/selection/checkbox-and-checkbox-group/#checkbox-group
export class EuiCheckBoxWrapper {
  private readonly checkBoxWrapper: Locator;
  private readonly checkBoxInput: Locator;
  private readonly checkBoxLabel: Locator;

  /**
   * Create a new EuiCheckBoxWrapper instance.
   * new EuiCheckBoxWrapper(page, { dataTestSubj: 'myCheckBox' })
   * new EuiCheckBoxWrapper(page, 'myCheckBox') // backward compatibility
   * new EuiCheckBoxWrapper(page, { locator: 'role=checkbox[name="I am a checkbox"]' })
   */
  constructor(page: ScoutPage, selector: SelectorInput) {
    this.checkBoxWrapper = resolveSelector(page, selector);
    this.checkBoxInput = this.checkBoxWrapper.locator('input.euiCheckbox__input');
    this.checkBoxLabel = this.checkBoxWrapper.locator('.euiCheckbox__label');
  }

  async isChecked(): Promise<boolean> {
    return await this.checkBoxInput.isChecked();
  }

  private async setCheckboxState(shouldBeChecked: boolean): Promise<void> {
    // Ensure element is consistently present and stable in the DOM
    await this.checkBoxInput.waitFor({ state: 'attached' });
    await this.checkBoxInput.waitFor({ state: 'visible' });

    // Check current state
    const isCurrentlyChecked = await this.checkBoxInput.isChecked();
    if (isCurrentlyChecked === shouldBeChecked) {
      return; // Already in desired state, no action needed
    }

    if (shouldBeChecked) {
      await this.checkBoxInput.check();
    } else {
      await this.checkBoxInput.uncheck();
    }
  }

  async check() {
    await this.setCheckboxState(true);
  }

  async uncheck() {
    await this.setCheckboxState(false);
  }

  async getLabel() {
    return (await this.checkBoxLabel.textContent()) ?? '';
  }
}
