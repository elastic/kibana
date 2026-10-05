/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaCodeEditorWrapper, type Locator, type ScoutPage } from '@kbn/scout';

export class DataViewDetailPage {
  readonly container;
  readonly editButton;
  readonly fieldsTab;
  readonly scriptedFieldsTab;
  readonly fieldFilter;
  readonly refreshButton;
  readonly typeFilterTrigger;
  readonly schemaFilterTrigger;
  readonly mappingConflictBadge;
  readonly viewConflictsButton;
  readonly addFieldButton;
  readonly fieldEditorFlyout;
  readonly fieldEditorSaveButton;
  readonly fieldEditorCancelButton;
  readonly popularityInput;
  readonly fieldEditorAdvancedToggle;
  readonly currentTimeField;

  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);
    this.container = page.testSubj.locator('editIndexPattern');
    this.editButton = page.testSubj.locator('editIndexPatternButton');
    this.fieldsTab = page.testSubj.locator('tab-indexedFields');
    this.scriptedFieldsTab = page.testSubj.locator('tab-scriptedFields');
    this.fieldFilter = page.testSubj.locator('indexPatternFieldFilter');
    this.refreshButton = page.testSubj.locator('refreshDataViewButton');
    this.typeFilterTrigger = page.testSubj.locator('indexedFieldTypeFilterDropdown');
    this.schemaFilterTrigger = page.testSubj.locator('schemaFieldTypeFilterDropdown');
    this.mappingConflictBadge = page.testSubj.locator('dataViewMappingConflict');
    this.viewConflictsButton = page.testSubj.locator('viewDataViewMappingConflictsButton');
    this.addFieldButton = page.testSubj.locator('addField');
    this.fieldEditorFlyout = page.testSubj.locator('fieldEditor');
    this.fieldEditorSaveButton = page.testSubj.locator('fieldSaveButton');
    this.fieldEditorCancelButton = this.fieldEditorFlyout.getByTestId('closeFlyoutButton');
    this.popularityInput = page.testSubj.locator('editorFieldCount');
    this.fieldEditorAdvancedToggle = page.testSubj.locator('toggleAdvancedSetting');
    this.currentTimeField = page.testSubj.locator('currentIndexPatternTimeField');
  }

  async goto(dataViewId: string): Promise<void> {
    await this.page.gotoApp(`management/kibana/dataViews/dataView/${dataViewId}`);
    await this.container.waitFor({ state: 'visible' });
  }

  /** Returns the number in the "Fields (N)" tab title; while filtering it reads "Fields (0 / N)". */
  async getFieldsTabCount(): Promise<number> {
    const text = await this.fieldsTab.innerText();
    const match = text.match(/(\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /** The scripted fields tab only renders once the data view has scripted fields. */
  async getScriptedFieldsTabCount(): Promise<number> {
    if ((await this.scriptedFieldsTab.count()) === 0) return 0;
    const text = await this.scriptedFieldsTab.innerText();
    const match = text.match(/(\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async openScriptedFieldsTab(): Promise<void> {
    await this.scriptedFieldsTab.click();
  }

  async getFieldNames(): Promise<string[]> {
    const cells = this.container.locator('[data-test-subj="indexedFieldName"]');
    const all = await cells.all();
    // Scope to the field-name span to avoid tab characters from sibling icon elements
    return Promise.all(
      all.map((c) =>
        c
          .locator('[data-test-subj^="field-name-"]')
          .innerText()
          .then((t) => t.trim())
      )
    );
  }

  async getFieldTypes(): Promise<string[]> {
    const cells = this.container.locator('[data-test-subj="indexedFieldType"]');
    const all = await cells.all();
    // Split by newline, trim each line, and drop icon-only lines (e.g. "↦" from EuiBadge icons)
    return Promise.all(
      all.map((c) =>
        c.innerText().then((t) =>
          t
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && /\w/.test(line))
            .join('\n')
        )
      )
    );
  }

  async setFieldTypeFilter(type: string): Promise<void> {
    await this.typeFilterTrigger.click();
    const selectable = this.page.testSubj.locator('indexedFieldTypeSelectable');
    await selectable.waitFor({ state: 'visible' });
    await this.page.testSubj.locator(`selectable-option-${type}`).click();
    await this.page.keyboard.press('Escape');
  }

  async setSchemaFieldTypeFilter(type: string): Promise<void> {
    await this.schemaFilterTrigger.click();
    const selectable = this.page.testSubj.locator('schemaTypeSelectable');
    await selectable.waitFor({ state: 'visible' });
    await this.page.testSubj.locator(`selectable-option-${type}`).click();
    await this.page.keyboard.press('Escape');
  }

  async filterByText(text: string): Promise<void> {
    await this.fieldFilter.fill(text);
  }

  async refreshFieldList(): Promise<void> {
    await this.refreshButton.click();
    await this.refreshButton
      .and(this.page.locator(':not([disabled])'))
      .waitFor({ state: 'visible' });
  }

  /** Row of the fields table of exactly this field (not its subfields or similarly named fields). */
  fieldRow(fieldName: string): Locator {
    return this.container
      .locator('tr')
      .filter({ has: this.page.testSubj.locator(`field-name-${fieldName}`) });
  }

  async openAddFieldFlyout(): Promise<void> {
    await this.addFieldButton.click();
    await this.fieldEditorFlyout.waitFor({ state: 'visible' });
  }

  async openFieldEditorForField(fieldName: string): Promise<void> {
    await this.filterByText(fieldName);
    await this.fieldRow(fieldName).locator('[data-test-subj="editFieldFormat"]').click();
    await this.page.testSubj.locator('flyoutTitle').waitFor({ state: 'visible' });
  }

  /** Deletes a runtime field from its table row and confirms the modal. */
  async deleteField(fieldName: string): Promise<void> {
    await this.fieldRow(fieldName).locator('[data-test-subj="deleteField"]').click();
    await this.page.testSubj.fill('deleteModalConfirmText', 'remove');
    await this.page.testSubj.click('confirmModalConfirmButton');
  }

  /** Closes an unmodified field editor flyout. */
  async closeFieldEditor(): Promise<void> {
    await this.fieldEditorCancelButton.click();
    await this.fieldEditorFlyout.waitFor({ state: 'hidden' });
  }

  async showFieldEditorAdvancedSettings(): Promise<void> {
    const advancedSection = this.page.testSubj.locator('advancedSettings');
    if (!(await advancedSection.isVisible())) {
      await this.fieldEditorAdvancedToggle.click();
      await advancedSection.waitFor({ state: 'visible' });
    }
  }

  async getPopularity(): Promise<string> {
    return this.popularityInput.inputValue();
  }

  async setPopularity(value: number): Promise<void> {
    await this.popularityInput.fill(String(value));
  }

  async saveFieldEditor(): Promise<void> {
    await this.fieldEditorSaveButton.click();
    await this.fieldEditorFlyout.waitFor({ state: 'hidden' });
  }

  async openEditFlyout(): Promise<void> {
    await this.editButton.click();
    await this.page.testSubj.locator('indexPatternEditorFlyout').waitFor({ state: 'visible' });
  }

  async addRuntimeField(name: string, type: string, script: string): Promise<void> {
    await this.addFieldButton.click();
    await this.page.testSubj.locator('flyoutTitle').waitFor({ state: 'visible' });
    await this.page.testSubj.locator('nameField').locator('input').fill(name);
    await this.page.components.comboBox('typeField').setSelectedOptions([type]);
    // Click the toggle inside the "Set value" row to reveal the script editor
    const valueRow = this.page.testSubj.locator('valueRow');
    await valueRow.locator('[data-test-subj="toggle"]').click();
    const scriptFieldRow = this.page.testSubj.locator('scriptFieldRow');
    await scriptFieldRow.waitFor({ state: 'visible' });
    await this.codeEditor.setCodeEditorValueByTestSubj('scriptFieldRow', script);
    await this.fieldEditorSaveButton.click();
    await this.fieldEditorFlyout.waitFor({ state: 'hidden' });
  }

  async delete(): Promise<void> {
    const deleteBtn = this.page.testSubj.locator('deleteIndexPatternButton');
    const overflowBtn = this.page.locator('[data-test-subj*="overflowButton"]');
    // Depending on header width, delete renders inline or inside the overflow menu.
    await deleteBtn.or(overflowBtn).waitFor({ state: 'visible' });
    if (!(await deleteBtn.isVisible())) {
      await overflowBtn.click();
    }
    await deleteBtn.click();
    await this.page.testSubj.locator('deleteDataViewFlyoutHeader').waitFor({ state: 'visible' });
    await this.page.testSubj.click('confirmFlyoutConfirmButton');
  }
}
