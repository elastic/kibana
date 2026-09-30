/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';

export class DataViewEditorFlyoutPage {
  readonly flyout;
  readonly form;
  readonly titleInput;
  readonly nameInput;
  readonly timestampField;
  readonly saveButton;
  readonly confirmButton;
  readonly pageTitle;
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
    this.pageTitle = page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title);
    this.statusMessage = page.testSubj.locator('createIndexPatternStatusMessage');
    this.advancedToggle = page.testSubj.locator('toggleAdvancedSetting');
  }

  async waitForOpen(): Promise<void> {
    await this.flyout.waitFor({ state: 'visible' });
  }

  /** Fills the title (index pattern) field, retrying until validation settles. */
  async setTitle(title: string): Promise<void> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const isLastAttempt = attempt === maxAttempts;
      if (attempt > 1) {
        await this.titleInput.fill('');
      }
      await this.titleInput.fill(title);
      try {
        await this.waitForValidTitle(title, isLastAttempt ? 30_000 : 5_000);
        return;
      } catch (error) {
        if (isLastAttempt) throw error;
      }
    }
  }

  private async waitForValidTitle(title: string, timeout = 30_000): Promise<void> {
    await this.titleInput
      .and(this.page.locator(`[value="${title}"]`))
      .waitFor({ state: 'attached', timeout });
    await this.titleInput
      .and(this.page.locator('[data-is-validating="0"]'))
      .waitFor({ state: 'visible', timeout });
    await this.form
      .and(this.page.locator('[data-validation-error="0"]'))
      .waitFor({ state: 'attached', timeout });
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
    const input = this.timestampField.locator('input[data-test-subj="comboBoxSearchInput"]');
    const isEnabled = await input.isEnabled();
    if (!isEnabled) return;
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

  async isSaveButtonEnabled(): Promise<boolean> {
    return this.saveButton.isEnabled();
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
