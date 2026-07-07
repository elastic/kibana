/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';

export class MarkdownVisPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');

  public async getEditedText() {
    const textarea = await this.testSubjects.find('euiMarkdownEditorTextArea');
    return await textarea.getVisibleText();
  }

  public async getRenderedText() {
    const markdownRenderer = await this.testSubjects.find('markdownRenderer');
    return await markdownRenderer.getVisibleText();
  }

  public async typeText(markdownTxt: string) {
    const input = await this.testSubjects.find('euiMarkdownEditorTextArea');
    await input.clearValue();
    await input.type(markdownTxt);
  }

  public async applyChanges() {
    const input = await this.testSubjects.find('markdownEditorApplyButton');
    await input.click();
  }

  public async discardChanges() {
    const input = await this.testSubjects.find('markdownEditorDiscardButton');
    await input.click();
  }
  public async clickPreview() {
    await (await this.testSubjects.find('markdownEditorPreview')).click();
  }
  public async clickEditor() {
    await (await this.testSubjects.find('markdownEditorEditor')).click();
  }

  public async getMarkdownText() {
    const markdownContainer = await this.testSubjects.find('markdownRenderer');
    return markdownContainer.getVisibleText();
  }

  public async getMarkdownTextByTag(selector: string) {
    const markdownContainer = await this.testSubjects.find('markdownRenderer');
    const element = await this.find.descendantDisplayedByCssSelector(selector, markdownContainer);
    return element.getVisibleText();
  }
}
