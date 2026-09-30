/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

export class DataViewDetailPage {
  readonly container;
  readonly editButton;
  readonly fieldsTab;
  readonly fieldFilter;
  readonly clearFilterButton;
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

  constructor(private readonly page: ScoutPage) {
    this.container = page.testSubj.locator('editIndexPattern');
    this.editButton = page.testSubj.locator('editIndexPatternButton');
    this.fieldsTab = page.testSubj.locator('tab-indexedFields');
    this.fieldFilter = page.testSubj.locator('indexPatternFieldFilter');
    this.clearFilterButton = page.testSubj.locator('clearSearchButton');
    this.refreshButton = page.testSubj.locator('refreshDataViewButton');
    this.typeFilterTrigger = page.testSubj.locator('indexedFieldTypeFilterDropdown');
    this.schemaFilterTrigger = page.testSubj.locator('schemaFieldTypeFilterDropdown');
    this.mappingConflictBadge = page.testSubj.locator('dataViewMappingConflict');
    this.viewConflictsButton = page.testSubj.locator('viewDataViewMappingConflictsButton');
    this.addFieldButton = page.testSubj.locator('addField');
    this.fieldEditorFlyout = page.testSubj.locator('fieldEditor');
    this.fieldEditorSaveButton = page.testSubj.locator('fieldSaveButton');
    this.fieldEditorCancelButton = page.testSubj.locator('fieldCancelButton');
    this.popularityInput = page.testSubj.locator('editorFieldCount');
    this.fieldEditorAdvancedToggle = page.testSubj.locator('toggleAdvancedSetting');
  }

  async goto(dataViewId: string): Promise<void> {
    await this.page.gotoApp(`management/kibana/dataViews/dataView/${dataViewId}`);
    await this.container.waitFor({ state: 'visible' });
  }

  async getFieldsTabCount(): Promise<number> {
    const text = await this.fieldsTab.innerText();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
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

  async clearFieldTypeFilter(type: string): Promise<void> {
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

  async clearTextFilter(): Promise<void> {
    await this.clearFilterButton.click();
  }

  async refreshFieldList(): Promise<void> {
    await this.refreshButton.click();
    await this.refreshButton
      .and(this.page.locator(':not([disabled])'))
      .waitFor({ state: 'visible' });
  }

  async openFieldEditorForField(fieldName: string): Promise<void> {
    await this.filterByText(fieldName);
    const row = this.container.locator('tr').filter({ hasText: fieldName });
    await row.locator('[data-test-subj="editFieldFormat"]').click();
    await this.page.testSubj.locator('flyoutTitle').waitFor({ state: 'visible' });
  }

  async closeFieldEditor(): Promise<void> {
    await this.page.keyboard.press('Escape');
    const confirmModal = this.page.testSubj.locator('runtimeFieldModifiedFieldConfirmModal');
    const hasConfirmModal = await confirmModal.isVisible().catch(() => false);
    if (hasConfirmModal) {
      await this.page.testSubj.click('confirmModalConfirmButton');
    }
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
    await scriptFieldRow.waitFor({ state: 'visible', timeout: 15_000 });
    // Focus the Monaco editor and type via keyboard events (fill() on textarea.inputarea is partial)
    const monacoEditor = scriptFieldRow.locator('.monaco-editor');
    await monacoEditor.waitFor({ state: 'visible', timeout: 10_000 });
    await monacoEditor.click();
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.type(script);
    await this.page.keyboard.press('Escape');
    await this.fieldEditorSaveButton.click();
    await this.fieldEditorFlyout.waitFor({ state: 'hidden' });
  }

  async delete(): Promise<void> {
    const deleteBtn = this.page.testSubj.locator('deleteIndexPatternButton');
    const isDirectlyVisible = await deleteBtn.isVisible().catch(() => false);
    if (!isDirectlyVisible) {
      const overflowBtn = this.page.locator('[data-test-subj*="overflowButton"]');
      const hasOverflow = await overflowBtn.isVisible().catch(() => false);
      if (hasOverflow) {
        await overflowBtn.click();
        await deleteBtn.waitFor({ state: 'visible' });
      }
    }
    await deleteBtn.click();
    await this.page.testSubj.locator('deleteDataViewFlyoutHeader').waitFor({ state: 'visible' });
    await this.page.testSubj.click('confirmFlyoutConfirmButton');
  }
}
