/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class DataViewEditorFlyoutPage {
  readonly flyout;
  readonly form;
  readonly titleInput;
  readonly nameInput;
  readonly timestampField;
  readonly saveButton;
  readonly confirmButton;
  readonly statusMessage;
  readonly advancedToggle;

  constructor(private readonly page: ScoutPage) {
    this.flyout = page.testSubj.locator('indexPatternEditorFlyout');
    this.form = page.testSubj.locator('indexPatternEditorForm');
    this.titleInput = page.testSubj.locator('createIndexPatternTitleInput');
    this.nameInput = page.testSubj.locator('createIndexPatternNameInput');
    this.timestampField = page.testSubj.locator('timestampField');
    this.saveButton = page.testSubj.locator('saveIndexPatternButton');
    this.confirmButton = page.testSubj.locator('confirmModalConfirmButton');
    this.statusMessage = page.testSubj.locator('createIndexPatternStatusMessage');
    this.advancedToggle = page.testSubj.locator('toggleAdvancedSetting');
  }

  /**
   * Fills the title (index pattern) field and waits until it validates as a matching pattern.
   * Retries: the editor validates the title against its previous, debounced index lookup, so the
   * field can get stuck on a stale "must match" error. Clearing it forces a real value change that
   * re-validates against the settled pattern.
   */
  async setTitle(title: string): Promise<void> {
    await expect(async () => {
      await this.titleInput.fill('');
      await this.fillTitle(title);
      await expect(this.form).toHaveAttribute('data-validation-error', '0', { timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
  }

  /** Fills the title field and waits for validation to settle, without requiring it to pass. */
  async fillTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
    await this.titleInput
      .and(this.page.locator(`[value="${title}"]`))
      .waitFor({ state: 'attached' });
    await this.titleInput
      .and(this.page.locator('[data-is-validating="0"]'))
      .waitFor({ state: 'visible' });
  }

  async setName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async getTimestampFieldValue(): Promise<string> {
    await this.timestampField
      .and(this.page.locator('[data-is-loading="0"]'))
      .waitFor({ state: 'visible' });
    return this.timestampField.locator('input[data-test-subj="comboBoxSearchInput"]').inputValue();
  }

  async selectTimestampField(value: string): Promise<void> {
    await this.timestampField
      .and(this.page.locator('[data-is-loading="0"]'))
      .waitFor({ state: 'visible' });
    await this.page.components.comboBox('timestampField').setSelectedOptions([value]);
  }

  async showAdvancedSettings(): Promise<void> {
    const advancedSection = this.page.testSubj.locator('advancedSettings');
    const isVisible = await advancedSection.isVisible();
    if (!isVisible) {
      await this.advancedToggle.click();
      await advancedSection.waitFor({ state: 'visible' });
    }
  }

  async enableAllowHidden(): Promise<void> {
    await this.showAdvancedSettings();
    const allowHiddenField = this.page.testSubj.locator('allowHiddenField');
    const button = allowHiddenField.locator('button');
    if ((await button.getAttribute('aria-checked')) !== 'true') {
      await button.click();
      await button.and(this.page.locator('[aria-checked="true"]')).waitFor({ state: 'visible' });
    }
  }

  async isAllowHiddenEnabled(): Promise<boolean> {
    const allowHiddenField = this.page.testSubj.locator('allowHiddenField');
    const button = allowHiddenField.locator('button');
    return (await button.getAttribute('aria-checked')) === 'true';
  }

  async save({ withConfirmation = false }: { withConfirmation?: boolean } = {}): Promise<void> {
    await this.saveButton.waitFor({ state: 'visible', timeout: 30_000 });
    await this.saveButton.click();
    if (withConfirmation) {
      await this.confirmButton.waitFor({ state: 'visible' });
      await this.confirmButton.click();
    }
    await this.flyout.waitFor({ state: 'hidden', timeout: 30_000 });
  }

  async close(): Promise<void> {
    await this.page.testSubj.click('closeFlyoutButton');
    await this.flyout.waitFor({ state: 'hidden' });
  }
}
