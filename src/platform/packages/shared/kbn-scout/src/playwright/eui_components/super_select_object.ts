/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BaseObject, type ObjectScope } from '@elastic/eui-test-helpers';
import type { Locator } from '@playwright/test';

/**
 * Playwright Component Object for
 * {@link https://eui.elastic.co/docs/components/forms/selection/super-select/ EuiSuperSelect}.
 *
 * Prototype for `@elastic/eui-test-helpers` (see the package CONTRIBUTING guide);
 * lives in kbn-scout until it is ported and published.
 *
 * `testSubj` must be the `data-test-subj` set on the `EuiSuperSelect` — EUI
 * spreads it onto the control `<button>` (`.euiSuperSelectControl`).
 */
export class EuiSuperSelectObject extends BaseObject {
  constructor(scope: ObjectScope, testSubj: string) {
    super(scope, testSubj, '.euiSuperSelectControl');
  }

  /**
   * Selects an option by its `value`. EUI renders every option with
   * `id={String(value)}`, so this works for any EuiSuperSelect without extra
   * test hooks and is the preferred method when the value is a stable code
   * constant.
   */
  async selectOptionByValue(value: string): Promise<void> {
    await this.open();
    await this.listbox.locator(`[role="option"][id="${value}"]`).click();
    await this.listbox.waitFor({ state: 'detached' });
  }

  /**
   * Selects an option by its visible label. Use for dynamic, data-driven
   * option content where the value is not known to the test. Note the dropdown
   * shows `dropdownDisplay` when the consumer provides it, which can differ
   * from the committed `inputDisplay` text.
   */
  async selectOptionByLabel(label: string): Promise<void> {
    await this.open();
    await this.listbox.getByRole('option', { name: label }).click();
    await this.listbox.waitFor({ state: 'detached' });
  }

  /**
   * The committed selection's `value`, read from the hidden form input EUI
   * renders next to the control (the visible button text shows the label, not
   * the value).
   */
  async getSelectedValue(): Promise<string> {
    return this.hiddenInput.inputValue();
  }

  /** Opens the dropdown if it is not already open. */
  private async open(): Promise<void> {
    if (await this.listbox.isVisible()) {
      return;
    }
    await this.root.click();
    await this.listbox.waitFor({ state: 'visible' });
  }

  /**
   * The options listbox. It renders in a popover portal, but EUI keeps at most
   * one super-select dropdown open at a time, so a page-level lookup is safe.
   */
  private get listbox(): Locator {
    return this.root.page().locator('.euiSuperSelect__listbox[role="listbox"]');
  }

  /**
   * The hidden input is a sibling of the control button; reach it through the
   * `.euiSuperSelect` popover wrapper that contains this instance's button.
   */
  private get hiddenInput(): Locator {
    return this.scope
      .locator('.euiSuperSelect')
      .filter({ has: this.root })
      .locator('input[type="hidden"]');
  }
}
