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
 * Page object for the **per-field** editor flyout opened by the data-view
 * switcher's "Add field" / column-menu "Edit field" actions. Mirrors the
 * subset of FTR `fieldEditor` service used by Discover-side tests:
 * setting name and type, enabling a runtime value script, saving, and
 * confirming destructive saves / deletes.
 *
 * Distinct from {@link DataViewEditorPage}, which edits the data view
 * itself (title, timestamp field) rather than its fields.
 */
export class DataViewsFieldEditor {
  private readonly flyout;
  private readonly nameInput;
  private readonly valueRow;
  private readonly typeField;
  private readonly saveButton;

  constructor(private readonly page: ScoutPage) {
    this.flyout = page.testSubj.locator('fieldEditor');
    this.nameInput = page.testSubj.locator('nameField').locator('input');
    this.valueRow = page.testSubj.locator('valueRow');
    this.typeField = page.testSubj.locator('typeField');
    this.saveButton = page.testSubj.locator('fieldSaveButton');
  }

  /**
   * Set the field name. Mirrors FTR `fieldEditor.setName(name, clearFirst)`.
   * `clearFirst` clears the input via Ctrl/Cmd-A + Delete before typing,
   * which is the only way to reliably reset a controlled EUI input that
   * has a non-empty default value.
   */
  async setName(name: string, clearFirst = false): Promise<void> {
    if (clearFirst) {
      await this.nameInput.click();
      await this.nameInput.press('ControlOrMeta+a');
      await this.nameInput.press('Delete');
    }
    await this.nameInput.fill(name);
  }

  /** Set the field type via the type combobox. */
  async setFieldType(type: string): Promise<void> {
    const combo = this.typeField.locator('input[data-test-subj="comboBoxSearchInput"]');
    await combo.fill(type);
    await this.page.getByRole('option', { name: type, exact: true }).click();
  }

  /**
   * Enable the "Set value" toggle so a runtime field script can be entered.
   * The toggle is an EUI switch; clicking the visible button label flips
   * the underlying checkbox. No-op if already on.
   */
  async enableValue(): Promise<void> {
    const toggle = this.valueRow.locator('[data-test-subj="toggle"]');
    if ((await toggle.getAttribute('aria-checked')) !== 'true') {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'true');
    }
  }

  /**
   * Type a Painless script into the runtime-field Monaco editor. Caller
   * must have called {@link enableValue} first. We type character-by-
   * character to avoid racing Monaco's syntax-validation debouncer; this
   * mirrors FTR `fieldEditor.typeScript()` and is the same workaround it
   * documents.
   */
  async typeScript(script: string): Promise<void> {
    const editor = this.valueRow.locator('.react-monaco-editor-container .monaco-editor textarea');
    await editor.click();
    await this.page.keyboard.type(script);
  }

  /** Click the "Save" button. */
  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * Confirm a save that requires acknowledging breaking changes. Mirrors
   * FTR `fieldEditor.confirmSave()` — types the literal `"change"` into
   * the confirmation input and submits.
   */
  async confirmSave(): Promise<void> {
    await this.page.testSubj.fill('saveModalConfirmText', 'change');
    await this.page.testSubj.click('confirmModalConfirmButton');
  }

  /**
   * Confirm a destructive delete. Mirrors FTR `fieldEditor.confirmDelete()`
   * — types the literal `"remove"` into the confirmation input and submits.
   */
  async confirmDelete(): Promise<void> {
    await this.page.testSubj.fill('deleteModalConfirmText', 'remove');
    await this.page.testSubj.click('confirmModalConfirmButton');
  }

  /** Wait for the field-editor flyout to fully close. */
  async waitUntilClosed(): Promise<void> {
    await expect(this.flyout).toBeHidden({ timeout: 30_000 });
  }

  /**
   * Assert the flyout is closed (or never opened). Useful as a guard
   * before navigating away from the host app.
   */
  async ensureModalIsClosed(): Promise<void> {
    await expect(this.flyout).toBeHidden();
  }
}
