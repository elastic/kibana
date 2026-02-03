/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class Console {
  public consoleSkipTourButton: Locator;
  public consoleMonacoEditor: Locator;

  constructor(public readonly page: ScoutPage) {
    this.consoleSkipTourButton = this.page.testSubj.locator('consoleSkipTourButton');
    this.consoleMonacoEditor = this.page.testSubj.locator('consoleMonacoEditor');
  }

  async goto() {
    await this.page.gotoApp('dev_tools', { hash: '/console/shell' });
    // await this.page.pause();
    const monacoEditor = this.page.testSubj.locator('consoleMonacoEditorContainer');
    // const outputViewDiv = outputPanel.locator('.monaco-scrollable-element');
    await monacoEditor.waitFor();
    // I'd like to simplify this, not sure why something this complex is needed to ensure the page is ready
    await this.getEditorText();
  }

  public async clickSkipTour() {
    await this.consoleSkipTourButton.click();
  }

  async skipTourIfExists() {
    // not sure how long to wait for tour
    // would be better if we KNEW when the tour might appear
    await this.consoleSkipTourButton
      .waitFor({
        state: 'visible',
        timeout: 2000,
      })
      .catch(() => {
        return false;
      });

    const tourShown = await this.consoleSkipTourButton.isVisible().catch(() => false);

    if (tourShown) {
      await this.clickSkipTour();
    }
  }

  public async getEditorText() {
    const editorViewDiv = this.consoleMonacoEditor.locator('.view-lines');
    return await editorViewDiv.textContent();
  }

  /*
  public async clearEditorText() {
    const editor = this.page.getByRole('code');
    await editor.click();

    let text = (await this.getEditorText()) || '';
    do {
      await this.page.keyboard.press('ControlOrMeta+KeyA');
      await this.page.keyboard.press('Backspace');
      text = (await this.getEditorText()) || '';
    } while (text.length > 0);
  }
    */

  public async enterText(text: string) {
    const textArea = this.consoleMonacoEditor.locator('textarea');
    await textArea.type(text);
  }

  public async selectAllRequests() {
    const textArea = this.consoleMonacoEditor.locator('textarea');
    await textArea.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  }

  public async clickPlay() {
    await this.page.testSubj.locator('sendRequestButton').click();
  }

  public async isPlayButtonVisible() {
    return await this.page.testSubj.locator('sendRequestButton').isVisible();
  }

  public async clickClearInput() {
    const clearButton = this.page.testSubj.locator('clearConsoleInput');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
  }

  public async clickClearOutput() {
    const clearButton = this.page.testSubj.locator('clearConsoleOutput');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
  }

  public getOutputText() {
    const outputPanel = this.page.testSubj.locator('consoleMonacoOutput');
    return outputPanel.locator('.monaco-scrollable-element');
    // return await outputViewDiv.textContent();
  }

  /*
  public async getOutputText() {
    const outputPanel = this.page.testSubj.locator('consoleMonacoOutput');
    const outputViewDiv = outputPanel.locator('.monaco-scrollable-element');
    return await outputViewDiv.textContent();
  }
    */

  public async getEditor() {
    return this.page.testSubj.locator('consoleMonacoEditor');
  }

  public async getResponseStatus() {
    const statusBadge = this.page.testSubj.locator('consoleResponseStatusBadge');
    const text = await statusBadge.textContent();
    // Extract just the number from the status text
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  public async openConsole() {
    await this.page.testSubj.locator('consoleShellButton').click();
  }

  public async openConfig() {
    await this.page.testSubj.locator('consoleConfigButton').click();
  }

  public async openHistory() {
    await this.page.testSubj.locator('consoleHistoryButton').click();
  }

  public async isShellOpen() {
    return await this.page.testSubj.locator('consoleEditorContainer').isVisible();
  }

  public async isConfigOpen() {
    return await this.page.testSubj.locator('consoleConfigPanel').isVisible();
  }

  public async isHistoryOpen() {
    return await this.page.testSubj.locator('consoleHistoryPanel').isVisible();
  }

  public async hasWarningBadge() {
    return await this.page.locator('.ace_badge--warning').isVisible();
  }

  public async hasSuccessBadge() {
    return await this.page.locator('.ace_badge--success').isVisible();
  }

  public async isOutputPanelEmptyStateVisible() {
    return await this.page.testSubj.locator('consoleOutputPanelEmptyState').isVisible();
  }
}
