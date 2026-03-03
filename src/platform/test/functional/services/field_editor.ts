/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';

export class FieldEditorService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly find = this.ctx.getService('find');
  private readonly comboBox = this.ctx.getService('comboBox');
  private readonly flyout = this.ctx.getService('flyout');
  private readonly monacoEditor = this.ctx.getService('monacoEditor');

  public async setName(name: string, clearFirst = false, typeCharByChar = false) {
    await this.testSubjects.setValue('nameField > input', name, {
      clearWithKeyboard: clearFirst,
      typeCharByChar,
    });
  }
  public async enableCustomLabel() {
    await this.testSubjects.setEuiSwitch('customLabelRow > toggle', 'check');
  }
  public async setCustomLabel(name: string) {
    await this.testSubjects.setValue('customLabelRow > input', name);
  }
  public async enableCustomDescription() {
    await this.testSubjects.setEuiSwitch('customDescriptionRow > toggle', 'check');
  }
  public async setCustomDescription(description: string) {
    await this.testSubjects.setValue('customDescriptionRow > input', description);
  }
  public async setPopularity(value: number) {
    await this.testSubjects.click('toggleAdvancedSetting');
    await this.testSubjects.setEuiSwitch('popularityRow > toggle', 'check');
    await this.testSubjects.setValue('editorFieldCount', String(value), {
      clearWithKeyboard: true,
    });
  }
  public async getFormError() {
    const alert = await this.find.byCssSelector(
      '[data-test-subj=indexPatternFieldEditorForm] > [role="alert"]'
    );
    return await alert.getVisibleText();
  }
  public async enableValue() {
    await this.testSubjects.setEuiSwitch('valueRow > toggle', 'check');
  }
  public async disableValue() {
    await this.testSubjects.setEuiSwitch('valueRow > toggle', 'uncheck');
  }
  public async clearScript() {
    await this.monacoEditor.clearCodeEditorValueByCssSelector(
      '[data-test-subj="valueRow"] .react-monaco-editor-container'
    );
  }

  public async typeScript(script: string) {
    await this.monacoEditor.setCodeEditorValueByCssSelector(
      '[data-test-subj="valueRow"] .react-monaco-editor-container',
      script
    );
  }
  public async save() {
    await this.testSubjects.click('fieldSaveButton');
  }

  async setUrlFieldFormat(template: string) {
    const urlTemplateField = await this.find.byCssSelector(
      'input[data-test-subj="urlEditorUrlTemplate"]'
    );
    await urlTemplateField.type(template);
  }

  public async setStaticLookupFormat(oldValue: string, newValue: string) {
    await this.testSubjects.click('staticLookupEditorAddEntry');
    await this.testSubjects.setValue('~staticLookupEditorKey', oldValue);
    await this.testSubjects.setValue('~staticLookupEditorValue', newValue);
  }

  public async setColorFormat(value: string, color: string, backgroundColor?: string) {
    await this.testSubjects.click('colorEditorAddColor');
    await this.testSubjects.setValue('~colorEditorKeyPattern', value);
    await this.testSubjects.click('~colorEditorColorPicker');
    await this.testSubjects.setValue('~euiColorPickerInput_bottom', color);
    if (backgroundColor) {
      await this.testSubjects.click('~colorEditorBackgroundPicker');
      await this.testSubjects.setValue('~euiColorPickerInput_bottom', backgroundColor);
    }
  }

  public async setStringFormat(transform: string) {
    await this.testSubjects.selectValue('stringEditorTransform', transform);
  }

  public async setTruncateFormatLength(length: string) {
    await this.testSubjects.setValue('truncateEditorLength', length);
  }

  public async setFieldType(type: string) {
    await this.comboBox.set('typeField', type);
  }

  public async setFieldFormat(format: string) {
    await this.find.clickByCssSelector(
      'select[data-test-subj="editorSelectedFormatId"] > option[value="' + format + '"]'
    );
  }

  public async setFormat(format: string) {
    await this.testSubjects.setEuiSwitch('formatRow > toggle', 'check');
    await this.setFieldFormat(format);
  }

  public async confirmSave() {
    await this.retry.try(async () => {
      await this.testSubjects.setValue('saveModalConfirmText', 'change');
      await this.testSubjects.clickWhenNotDisabledWithoutRetry('confirmModalConfirmButton', {
        timeout: 1000,
      });
    });
  }

  public async confirmDelete() {
    await this.retry.try(async () => {
      await this.testSubjects.setValue('deleteModalConfirmText', 'remove');
      await this.testSubjects.clickWhenNotDisabledWithoutRetry('confirmModalConfirmButton', {
        timeout: 1000,
      });
    });
  }

  public async confirmDiscardChanges() {
    await this.retry.try(async () => {
      await this.testSubjects.clickWhenNotDisabledWithoutRetry('confirmModalConfirmButton', {
        timeout: 1000,
      });
    });
  }

  public async waitUntilClosed() {
    await this.testSubjects.waitForDeleted('fieldEditor');
  }

  public async closeFlyoutAndDiscardChanges() {
    await this.flyout.closeFlyout('fieldEditor > ');
    await this.confirmDiscardChanges();
    await this.waitUntilClosed();
  }
}
