/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';
import { expect } from '..';

/**
 * Page object for the shared data view editor flyout (`indexPatternEditorFlyout`).
 *
 * The flyout is opened by many surfaces (Discover, Dashboard, Visualize, the
 * Data Views management app, Lens, ...), so this lives in core `@kbn/scout`.
 * Open the flyout from the relevant surface first (e.g. click the
 * `createDataViewButton` prompt), then drive it through this page object.
 */
export class DataViewEditor {
  private readonly flyout;
  private readonly form;
  readonly nameInput;
  readonly titleInput;
  readonly timestampField;
  readonly saveButton;

  constructor(private readonly page: ScoutPage) {
    this.flyout = this.page.testSubj.locator('indexPatternEditorFlyout');
    this.form = this.page.testSubj.locator('indexPatternEditorForm');
    this.nameInput = this.page.testSubj.locator('createIndexPatternNameInput');
    this.titleInput = this.page.testSubj.locator('createIndexPatternTitleInput');
    this.timestampField = this.page.testSubj.locator('timestampField');
    this.saveButton = this.page.testSubj.locator('saveIndexPatternButton');
  }

  async waitForFlyout(): Promise<void> {
    await this.flyout.waitFor({ state: 'visible' });
  }

  /** Fills the index pattern title and waits for async validation to settle. */
  async setTitle(title: string): Promise<void> {
    await this.waitForFlyout();
    await this.titleInput.fill(title);
    await expect(this.titleInput).toHaveValue(title);
    await expect(this.titleInput).toHaveAttribute('data-is-validating', '0', { timeout: 30_000 });
    await expect(this.titleInput).not.toHaveAttribute('aria-invalid', 'true');
    await expect(this.form).toHaveAttribute('data-validation-error', '0', { timeout: 30_000 });
  }

  /** Returns the timestamp field combo box value after the field finishes loading. */
  async getTimestampFieldValue(): Promise<string> {
    // `data-is-loading` is on the EuiComboBox element itself; narrow to it with `.and()`.
    await this.timestampField
      .and(this.page.locator('[data-is-loading="0"]'))
      .waitFor({ state: 'visible', timeout: 30_000 });
    return this.timestampField.locator('input[data-test-subj="comboBoxSearchInput"]').inputValue();
  }

  /**
   * Submits the flyout and waits for it to close.
   *
   * @param adHoc - when `true`, clicks "Use without saving" (`exploreIndexPatternButton`)
   *   to create a temporary ad-hoc data view instead of persisting it.
   * @param withConfirmation - when `true`, confirms the follow-up modal (e.g. when
   *   saving would overwrite/rollover an existing data view).
   */
  async save({
    adHoc = false,
    withConfirmation = false,
  }: { adHoc?: boolean; withConfirmation?: boolean } = {}): Promise<void> {
    // Wait for the timestamp options to finish loading so saving uses the resolved
    // default (e.g. `@timestamp`) instead of racing the async field population.
    await this.timestampField
      .and(this.page.locator('[data-is-loading="0"]'))
      .waitFor({ state: 'visible', timeout: 30_000 });

    const submitButton = adHoc
      ? this.page.testSubj.locator('exploreIndexPatternButton')
      : this.saveButton;
    await submitButton.waitFor({ state: 'visible', timeout: 30_000 });
    await submitButton.click();

    if (withConfirmation) {
      const confirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
      await confirmButton.waitFor({ state: 'visible' });
      await confirmButton.click();
    }

    await this.flyout.waitFor({ state: 'hidden' });
  }
}
