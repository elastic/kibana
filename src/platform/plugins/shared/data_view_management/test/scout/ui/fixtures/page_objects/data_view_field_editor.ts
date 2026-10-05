/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';

/**
 * Page object for what happens inside the field editors of a data view: the runtime field flyout
 * inputs (type, script, composite subfields, formats) and the scripted field form. Page-level
 * actions (opening the data view, the fields table, opening, saving, closing and deleting fields)
 * live in `DataViewDetailPage`. Methods perform actions and return state; specs own the assertions.
 */
export class DataViewFieldEditor {
  public readonly flyout: Locator;
  public readonly fieldPreviewItem: Locator;
  public readonly changeWarning: Locator;
  public readonly invalidScriptError: Locator;
  public readonly formatSelect: Locator;
  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.flyout = this.page.testSubj.locator('fieldEditor');
    this.fieldPreviewItem = this.page.testSubj.locator('fieldPreviewItem');
    this.changeWarning = this.page.testSubj.locator('changeWarning');
    this.invalidScriptError = this.page.testSubj.locator('invalidScriptError');
    this.formatSelect = this.page.testSubj.locator('editorSelectedFormatId');
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  // ── Runtime fields flyout ──────────────────────────────────────────────────

  async setFieldName(name: string): Promise<void> {
    await this.page.testSubj.locator('nameField').locator('input').fill(name);
  }

  /** Picks a field type (for example `Keyword`, `Long` or `Composite`) in the type combo box. */
  async setFieldType(type: string): Promise<void> {
    await this.page.components.comboBox('typeField').setSelectedOptions([type]);
  }

  /** Enables the "Set value" toggle, then writes the painless script of a runtime field. */
  async setFieldScript(script: string): Promise<void> {
    await this.toggleRow('valueRow');
    await this.codeEditor.waitCodeEditorReady('valueRow');
    await this.codeEditor.setCodeEditorValue(script);
  }

  /** Writes the script of a runtime field whose "Set value" toggle is already on. */
  async replaceFieldScript(script: string): Promise<void> {
    await this.codeEditor.waitCodeEditorReady('valueRow');
    await this.codeEditor.setCodeEditorValue(script);
  }

  async setCompositeScript(script: string): Promise<void> {
    await this.codeEditor.waitCodeEditorReady('scriptFieldRow');
    await this.codeEditor.setCodeEditorValue(script);
  }

  /** Locator for a field name in the preview pane of the flyout. */
  previewField(name: string): Locator {
    return this.fieldPreviewItem.filter({ hasText: name });
  }

  /** Locator for the subfield type selector of a composite runtime field. */
  compositeSubfieldType(index: number): Locator {
    return this.page.testSubj.locator(`typeField_${index}`);
  }

  /** Turns on the optional "Set format" row and selects a format. */
  async enableFormatAndSelect(format: string): Promise<void> {
    await this.toggleRow('formatRow');
    await this.selectFormat(format);
  }

  async selectFormat(format: string): Promise<void> {
    await this.formatSelect.selectOption(format);
  }

  // ── Format editors ─────────────────────────────────────────────────────────

  async setStringTransform(transform: string): Promise<void> {
    await this.page.testSubj.locator('stringEditorTransform').selectOption(transform);
  }

  async setUrlTemplates({
    urlTemplate,
    labelTemplate,
  }: {
    urlTemplate: string;
    labelTemplate: string;
  }): Promise<void> {
    await this.page.testSubj.fill('urlEditorUrlTemplate', urlTemplate);
    await this.page.testSubj.fill('urlEditorLabelTemplate', labelTemplate);
  }

  /** Adds a color rule that matches `pattern` with the given hex text and background colors. */
  async addColorRule({
    pattern,
    textColor,
    backgroundColor,
  }: {
    pattern: string;
    textColor: string;
    backgroundColor: string;
  }): Promise<void> {
    await this.page.testSubj.click('colorEditorAddColor');
    // The editor starts with a default rule at index 0; the rule is configured in place.
    await this.page.testSubj.fill('colorEditorKeyPattern 0', pattern);
    await this.pickColor('Select a text color for item 0', textColor);
    await this.pickColor('Select a background color for item 0', backgroundColor);
  }

  private async clickSave(): Promise<void> {
    await this.page.testSubj.click('fieldSaveButton');
  }

  /** Saves and confirms the "change field type" modal, then waits for the flyout to close. */
  async saveAndConfirmChange(): Promise<void> {
    await this.clickSave();
    await this.page.testSubj.fill('saveModalConfirmText', 'change');
    await this.page.testSubj.click('confirmModalConfirmButton');
    await this.flyout.waitFor({ state: 'hidden' });
  }

  // ── Scripted fields form ───────────────────────────────────────────────────

  /** Opens the create form of a data view's scripted fields; the data view page must be open. */
  async gotoCreateScriptedField(dataViewId: string): Promise<void> {
    await this.page.gotoApp(`management/kibana/dataViews/dataView/${dataViewId}/create-field`);
    await this.page.testSubj.locator('editorFieldName').waitFor({ state: 'visible' });
  }

  /** Opens the edit form of a scripted field from the scripted fields tab. */
  async openEditScriptedField(fieldName: string): Promise<void> {
    await this.page
      .locator('tr')
      .filter({ hasText: fieldName })
      .getByRole('button', { name: 'Edit' })
      .click();
    await this.page.testSubj.locator('fieldSaveButton').waitFor({ state: 'visible' });
  }

  async fillScriptedField({
    name,
    language,
    type,
    popularity,
    script,
  }: {
    name: string;
    language: string;
    type: string;
    popularity: string;
    script: string;
  }): Promise<void> {
    await this.page.testSubj.fill('editorFieldName', name);
    await this.page.testSubj.locator('editorFieldLang').selectOption(language);
    await this.page.testSubj.locator('editorFieldType').selectOption(type);
    await this.page.testSubj.fill('editorFieldCount', popularity);
    await this.codeEditor.setCodeEditorValue(script);
  }

  async saveScriptedField(): Promise<void> {
    await this.page.testSubj.click('fieldSaveButton');
  }

  /** Saves a valid scripted field and waits for the form to hand back to the data view page. */
  async saveScriptedFieldAndWaitForReturn(): Promise<void> {
    await this.saveScriptedField();
    await this.page.testSubj.locator('editIndexPattern').waitFor({ state: 'visible' });
  }

  private async pickColor(buttonName: string, hex: string): Promise<void> {
    const button = this.page.getByRole('button', { name: buttonName });
    const input = this.page.locator('[data-test-subj~="euiColorPickerInput_bottom"]');
    await button.click();
    await input.fill(hex);
    // Close the popover so only one picker input is in the DOM at a time
    await button.click();
    await input.waitFor({ state: 'hidden' });
  }

  private async toggleRow(rowTestSubj: string): Promise<void> {
    await this.page.testSubj.locator(rowTestSubj).locator('[data-test-subj="toggle"]').click();
  }
}
