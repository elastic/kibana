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
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';

// Detail page URL after a data view is saved: /app/management/kibana/dataViews/dataView/<id>
export const DATA_VIEW_DETAIL_URL_PATTERN = /\/management\/kibana\/dataViews\/.+/;

/**
 * Page object for the data view editor flyout.
 * Use `DataViewsManagementPage.openCreateWizard()` to open the flyout first,
 * then interact with it through this page object.
 */
export class DataViewEditorPage {
  private readonly flyout;
  private readonly form;
  readonly nameInput;
  readonly titleInput;
  readonly timestampField;
  readonly saveButton;
  readonly detailPageTitle;
  readonly detailUrlPattern = DATA_VIEW_DETAIL_URL_PATTERN;

  constructor(private readonly page: ScoutPage) {
    this.flyout = page.testSubj.locator('indexPatternEditorFlyout');
    this.form = page.testSubj.locator('indexPatternEditorForm');
    this.nameInput = page.testSubj.locator('createIndexPatternNameInput');
    this.titleInput = page.testSubj.locator('createIndexPatternTitleInput');
    this.timestampField = page.testSubj.locator('timestampField');
    this.saveButton = page.testSubj.locator('saveIndexPatternButton');
    this.detailPageTitle = page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title);
  }

  // Fills the title field and waits for async validation to settle.
  // Retries: title validation can race its debounced index lookup and get stuck invalid.
  async setTitle(title: string): Promise<void> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const isLastAttempt = attempt === maxAttempts;

      if (attempt > 1) {
        await this.titleInput.fill(''); // force a real value change to re-trigger validation
      }
      await this.titleInput.fill(title);

      try {
        await this.waitForValidTitle(title, isLastAttempt ? 30_000 : 5_000);
        return;
      } catch (error) {
        if (isLastAttempt) {
          throw error;
        }
      }
    }
  }

  private async waitForValidTitle(title: string, timeout = 30_000): Promise<void> {
    await expect(this.titleInput).toHaveValue(title);
    await expect(this.titleInput).toHaveAttribute('data-is-validating', '0', { timeout });
    await expect(this.titleInput).not.toHaveAttribute('aria-invalid', 'true', { timeout });
    await expect(this.form).toHaveAttribute('data-validation-error', '0', { timeout });
  }

  // Returns the timestamp field combo box value after the field finishes loading.
  async getTimestampFieldValue(): Promise<string> {
    // data-is-loading is on the EuiComboBox element itself; use .and() to narrow to it.
    await this.timestampField
      .and(this.page.locator('[data-is-loading="0"]'))
      .waitFor({ state: 'visible' });
    return this.timestampField.locator('input[data-test-subj="comboBoxSearchInput"]').inputValue();
  }

  async save({ withConfirmation = false }: { withConfirmation?: boolean } = {}): Promise<void> {
    await this.saveButton.waitFor({ state: 'visible', timeout: 30_000 });
    await this.saveButton.click();
    if (withConfirmation) {
      const confirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
      await confirmButton.waitFor({ state: 'visible' });
      await confirmButton.click();
    }
    await this.flyout.waitFor({ state: 'hidden' });
  }
}
