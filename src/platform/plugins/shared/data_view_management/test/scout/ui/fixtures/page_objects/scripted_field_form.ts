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
 * Page object for the scripted field create and edit form of a data view. It is a route of its
 * own, not a flyout, so it lives apart from `DataViewDetailPage`. Methods perform actions and
 * return state; specs own the assertions.
 */
export class ScriptedFieldForm {
  public readonly invalidScriptError: Locator;
  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.invalidScriptError = page.testSubj.locator('invalidScriptError');
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async gotoCreate(dataViewId: string): Promise<void> {
    await this.page.gotoApp(`management/kibana/dataViews/dataView/${dataViewId}/create-field`);
    await this.page.testSubj.locator('editorFieldName').waitFor({ state: 'visible' });
  }

  /** Opens the edit form of a scripted field from the scripted fields tab. */
  async openEdit(fieldName: string): Promise<void> {
    await this.page
      .locator('tr')
      .filter({ hasText: fieldName })
      .getByRole('button', { name: 'Edit' })
      .click();
    await this.page.testSubj.locator('fieldSaveButton').waitFor({ state: 'visible' });
  }

  async fill({
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

  async selectFormat(format: string): Promise<void> {
    await this.page.testSubj.locator('editorSelectedFormatId').selectOption(format);
  }

  async save(): Promise<void> {
    await this.page.testSubj.click('fieldSaveButton');
  }

  /** Saves a valid scripted field and waits for the form to hand back to the data view page. */
  async saveAndWaitForReturn(): Promise<void> {
    await this.save();
    await this.page.testSubj.locator('editIndexPattern').waitFor({ state: 'visible' });
  }
}
