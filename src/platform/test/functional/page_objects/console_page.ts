/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Key } from 'selenium-webdriver';
import { asyncForEach } from '@kbn/std';
import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class ConsolePageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly find = this.ctx.getService('find');
  private readonly common = this.ctx.getPageObject('common');
  private readonly browser = this.ctx.getService('browser');

  public async getTextArea() {
    const codeEditor = await this.testSubjects.find('consoleMonacoEditor');
    return await codeEditor.findByTagName('textarea');
  }

  public async getEditorText() {
    const codeEditor = await this.testSubjects.find('consoleMonacoEditor');
    const editorViewDiv = await codeEditor.findByClassName('view-lines');
    return await editorViewDiv.getVisibleText();
  }

  public async getEditorTextAtLine(line: number) {
    const codeEditor = await this.testSubjects.find('consoleMonacoEditor');
    const editorViewDiv = await codeEditor.findAllByClassName('view-line');
    return await editorViewDiv[line].getVisibleText();
  }

  public async getCurrentLineNumber() {
    const textArea = await this.getTextArea();
    const styleAttribute = (await textArea.getAttribute('style')) ?? '';
    const height = parseFloat(styleAttribute.replace(/.*height: ([+-]?\d+(\.\d+)?).*/, '$1'));
    const top = parseFloat(styleAttribute.replace(/.*top: ([+-]?\d+(\.\d+)?).*/, '$1'));
    // calculate the line number by dividing the top position by the line height
    // and adding 1 because line numbers start at 1
    return Math.ceil(top / height) + 1;
  }

  public async clearEditorText() {
    const textArea = await this.getTextArea();
    await textArea.clickMouseButton();
    await textArea.clearValueWithKeyboard();
  }

  public async focusInputEditor() {
    const outputEditor = await this.testSubjects.find('consoleMonacoEditor');
    // Simply clicking on the editor doesn't focus it, so we need to click
    // on the margin view overlays
    await (await outputEditor.findByClassName('margin-view-overlays')).click();
  }

  public async focusOutputEditor() {
    const outputEditor = await this.testSubjects.find('consoleMonacoOutput');
    // Simply clicking on the output editor doesn't focus it, so we need to click
    // on the margin view overlays
    await (await outputEditor.findByClassName('margin-view-overlays')).click();
  }

  public async getOutputText() {
    const outputPanel = await this.testSubjects.find('consoleMonacoOutput');
    const outputViewDiv = await outputPanel.findByClassName('monaco-scrollable-element');
    return await outputViewDiv.getVisibleText();
  }

  public async pressEnter() {
    const textArea = await this.getTextArea();
    await textArea.pressKeys(Key.ENTER);
  }

  public async enterText(text: string) {
    const textArea = await this.getTextArea();
    await textArea.type(text);
  }

  public async promptAutocomplete(letter = 'b') {
    const textArea = await this.getTextArea();
    await textArea.type(letter);
    await this.retry.waitFor('autocomplete to be visible', () => this.isAutocompleteVisible());
  }

  public async isAutocompleteVisible() {
    const element = await this.find.byClassName('suggest-widget').catch(() => null);
    if (!element) return false;

    const attribute = await element.getAttribute('style');
    return !attribute?.includes('display: none;');
  }

  public async getAutocompleteSuggestion(index: number) {
    const suggestionsWidget = await this.find.byClassName('suggest-widget');
    const suggestions = await suggestionsWidget.findAllByClassName('monaco-list-row');
    const suggestion = suggestions[index];
    if (!suggestion) {
      return undefined;
    }
    const label = await suggestion.findByClassName('label-name');
    return label.getVisibleText();
  }

  public async pressUp(shift: boolean = false) {
    const textArea = await this.getTextArea();
    await textArea.pressKeys(shift ? [Key.SHIFT, Key.UP] : Key.UP);
  }

  public async pressDown(shift: boolean = false) {
    const textArea = await this.getTextArea();
    await textArea.pressKeys(shift ? [Key.SHIFT, Key.DOWN] : Key.DOWN);
  }

  public async pressRight(shift: boolean = false) {
    const textArea = await this.getTextArea();
    await textArea.pressKeys(shift ? [Key.SHIFT, Key.RIGHT] : Key.RIGHT);
  }

  public async pressLeft(shift: boolean = false) {
    const textArea = await this.getTextArea();
    await textArea.pressKeys(shift ? [Key.SHIFT, Key.LEFT] : Key.LEFT);
  }

  public async pressCtrlSpace() {
    const textArea = await this.getTextArea();
    await textArea.pressKeys([
      Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'],
      Key.SPACE,
    ]);
  }
  public async pressCtrlEnter() {
    const textArea = await this.getTextArea();
    await textArea.pressKeys([
      Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'],
      Key.ENTER,
    ]);
  }

  public async pressCtrlI() {
    const textArea = await this.getTextArea();
    await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'i']);
  }

  public async pressCtrlUp() {
    const textArea = await this.getTextArea();
    await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], Key.UP]);
  }

  public async pressCtrlDown() {
    const textArea = await this.getTextArea();
    await textArea.pressKeys([
      Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'],
      Key.DOWN,
    ]);
  }

  public async pressCtrlL() {
    const textArea = await this.getTextArea();
    await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'l']);
  }

  public async pressCtrlSlash() {
    const textArea = await this.getTextArea();
    await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], '/']);
  }

  public async pressEscape() {
    const textArea = await this.getTextArea();
    await textArea.pressKeys(Key.ESCAPE);
  }

  public async selectAllRequests() {
    const textArea = await this.getTextArea();
    const selectionKey = Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'];
    await textArea.pressKeys([selectionKey, 'a']);
  }

  public async getEditor() {
    return await this.testSubjects.find('consoleMonacoEditor');
  }

  public async hasInvalidSyntax() {
    return await this.find.existsByCssSelector('.squiggly-error');
  }

  public async responseHasDeprecationWarning() {
    const response = await this.getOutputText();
    return response.trim().startsWith('#!');
  }

  public async selectCurrentRequest() {
    const textArea = await this.getTextArea();
    await textArea.clickMouseButton();
  }

  public async getFontSize() {
    const codeEditor = await this.testSubjects.find('consoleMonacoEditor');
    const editorViewDiv = await codeEditor.findByClassName('view-line');
    return await editorViewDiv.getComputedStyle('font-size');
  }

  public async pasteClipboardValue() {
    const textArea = await this.getTextArea();
    await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'v']);
  }

  public async copyRequestsToClipboard() {
    const textArea = await this.getTextArea();
    await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'a']);
    await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'c']);
  }

  public async isA11yOverlayVisible() {
    return await this.testSubjects.exists('codeEditorAccessibilityOverlay');
  }

  public async clickPlay() {
    await this.testSubjects.click('sendRequestButton');
  }

  public async isPlayButtonVisible() {
    return await this.testSubjects.exists('sendRequestButton');
  }

  public async clickCopyOutput() {
    await this.testSubjects.click('copyOutputButton');
  }

  public async clickClearInput() {
    const hasClearButton = await this.testSubjects.exists('clearConsoleInput');

    if (hasClearButton) {
      await this.testSubjects.click('clearConsoleInput');
    }
  }

  public async clickClearOutput() {
    const hasClearButton = await this.testSubjects.exists('clearConsoleOutput');

    if (hasClearButton) {
      await this.testSubjects.click('clearConsoleOutput');
    }
  }

  public async clickExportButton() {
    await this.testSubjects.click('consoleExportButton');
  }

  public async clickHelpIcon() {
    await this.testSubjects.click('consoleHelpButton');
  }

  public async clickShortcutsIcon() {
    await this.testSubjects.click('consoleShortcutsButton');
  }

  public async setFileToUpload(path: string) {
    const input = await this.find.byCssSelector('#importConsoleFile');
    await input.type(path);
  }

  public async acceptFileImport() {
    await this.testSubjects.click('confirmModalConfirmButton');
  }

  public async isHelpPopoverOpen() {
    const classAttribute = await this.testSubjects.getAttribute('consoleHelpPopover', 'class');
    return classAttribute?.includes('euiPopover-isOpen');
  }

  public async isShortcutsPopoverOpen() {
    const classAttribute = await this.testSubjects.getAttribute('consoleShortcutsPopover', 'class');
    return classAttribute?.includes('euiPopover-isOpen');
  }

  public async clickSkipTour() {
    await this.testSubjects.click('consoleSkipTourButton');
  }

  public async clickNextTourStep(andWaitFor: number = 0) {
    await this.testSubjects.click('consoleNextTourStepButton');

    if (andWaitFor) {
      await this.common.sleep(andWaitFor);
    }
  }

  public async clickCompleteTour() {
    await this.testSubjects.click('consoleCompleteTourButton');
  }

  public async clickRerunTour() {
    await this.testSubjects.click('consoleRerunTourButton');
  }

  public async openConsole() {
    await this.testSubjects.click('consoleShellButton');
  }

  public async openConfig() {
    await this.testSubjects.click('consoleConfigButton');
  }

  public async openHistory() {
    await this.testSubjects.click('consoleHistoryButton');
  }

  async isConsoleTabOpen(tabId: string) {
    await this.retry.waitFor('console container is displayed', async () => {
      return await this.testSubjects.isDisplayed('consolePanel');
    });
    return await this.testSubjects.exists(tabId);
  }

  public async isShellOpen() {
    return await this.isConsoleTabOpen('consoleEditorContainer');
  }

  public async isConfigOpen() {
    return await this.isConsoleTabOpen('consoleConfigPanel');
  }

  public async isHistoryOpen() {
    return await this.isConsoleTabOpen('consoleHistoryPanel');
  }

  public async openSettings() {
    await this.testSubjects.click('consoleConfigButton');
  }

  public async toggleA11yOverlaySetting() {
    // while the settings form opens/loads this may fail, so retry for a while
    await this.retry.try(async () => {
      const toggle = await this.testSubjects.find('enableA11yOverlay');
      await toggle.click();
    });
  }

  public async addNewVariable({ name, value }: { name: string; value: string }) {
    await this.retry.try(async () => {
      await this.testSubjects.click('variablesAddButton');

      const nameField = await this.testSubjects.find('nameField');
      await nameField.type(name);

      const valueField = await this.testSubjects.find('valueField');
      await valueField.type(value);
    });

    await this.testSubjects.click('addNewVariableButton');
  }

  public async removeVariables() {
    // while the variables form opens/loads this may fail, so retry for a while
    await this.retry.try(async () => {
      const buttons = await this.testSubjects.findAll('variablesRemoveButton');
      await asyncForEach(buttons, async (button) => {
        await button.click();
        await this.testSubjects.click('confirmModalConfirmButton');
      });
    });
  }

  public async copyVariableToClipboard(name: string) {
    await this.testSubjects.click(`variableCopyButton-${name}`);
  }

  public async getVariables() {
    const table = await this.testSubjects.find('variablesTable');
    const rows = await table.findAllByClassName('euiTableRow');
    const tableText = await table.getVisibleText();

    if (tableText.includes('No variables have been added yet')) {
      return [];
    }

    const rowsData = await Promise.all(
      rows.map(async (row) => {
        return {
          name: await (await row.findByTestSubject('variableNameCell')).getVisibleText(),
          value: await (await row.findByTestSubject('variableValueCell')).getVisibleText(),
        };
      })
    );

    return rowsData;
  }

  public async setFontSizeSetting(newSize: number) {
    // while the settings form opens/loads this may fail, so retry for a while
    await this.retry.try(async () => {
      const newSizeString = String(newSize);
      const fontSizeInput = await this.testSubjects.find('setting-font-size-input');
      await fontSizeInput.clearValue({ withJS: true });
      await fontSizeInput.click();
      await fontSizeInput.type(newSizeString);
      expect(await fontSizeInput.getAttribute('value')).to.be(newSizeString);
    });
  }

  public async toggleKeyboardShortcuts(enabled: boolean) {
    await this.openSettings();

    // while the settings form opens/loads this may fail, so retry for a while
    await this.retry.try(async () => {
      const toggle = await this.testSubjects.find('enableKeyboardShortcuts');
      await toggle.click();
    });
  }

  public async hasSuccessBadge() {
    return await this.find.existsByCssSelector('.ace_badge--success');
  }

  public async hasWarningBadge() {
    return await this.find.existsByCssSelector('.ace_badge--warning');
  }

  public async getResponseStatus() {
    const statusBadge = await this.testSubjects.find('consoleResponseStatusBadge');
    const text = await statusBadge.getVisibleText();
    return text.replace(/[^\d.]+/, '');
  }

  async skipTourIfExists() {
    await this.retry.try(async () => {
      const tourShown = await this.testSubjects.exists('consoleSkipTourButton');
      if (tourShown) {
        await this.clickSkipTour();
      }
    });
  }

  public async clickContextMenu() {
    const contextMenu = await this.testSubjects.find('toggleConsoleMenu');
    await contextMenu.click();
  }

  public async isContextMenuOpen() {
    return await this.testSubjects.exists('consoleMenu');
  }

  public async isCopyAsCurlButtonVisible() {
    return await this.testSubjects.exists('consoleMenuCopyAsCurl');
  }

  public async isOpenDocumentationButtonVisible() {
    return await this.testSubjects.exists('consoleMenuOpenDocs');
  }

  public async isAutoIndentButtonVisible() {
    return await this.testSubjects.exists('consoleMenuAutoIndent');
  }

  public async isCopyAsButtonVisible() {
    return await this.testSubjects.exists('consoleMenuCopyAsButton');
  }

  public async clickCopyAsCurlButton() {
    const button = await this.testSubjects.find('consoleMenuCopyAsCurl');
    await button.click();
  }

  public async changeLanguageAndCopy(language: string) {
    const openModalButton = await this.testSubjects.find('changeLanguageButton');
    await openModalButton.click();

    const changeLangButton = await this.testSubjects.find(`languageOption-${language}`);
    await changeLangButton.click();

    const submitButton = await this.testSubjects.find('copyAsLanguageSubmit');
    await submitButton.click();
  }

  public async changeDefaultLanguage(language: string) {
    const openModalButton = await this.testSubjects.find('changeLanguageButton');
    await openModalButton.click();

    const changeDefaultLangButton = await this.testSubjects.find(
      `changeDefaultLanguageTo-${language}`
    );
    await changeDefaultLangButton.click();

    const submitButton = await this.testSubjects.find('copyAsLanguageSubmit');
    await submitButton.click();
  }

  public async clickCopyAsButton() {
    const button = await this.testSubjects.find('consoleMenuCopyAsButton');
    await button.click();
  }

  public async clickOpenDocumentationButton() {
    const button = await this.testSubjects.find('consoleMenuOpenDocs');
    await button.click();
  }

  public async clickAutoIndentButton() {
    const button = await this.testSubjects.find('consoleMenuAutoIndent');
    await button.click();
  }

  public async clickHistory() {
    const historyButton = await this.testSubjects.find('consoleHistoryButton');
    await historyButton.click();
  }

  public async getHistoryEntries() {
    const history = await this.testSubjects.findAll('historyItemFieldset');
    return await Promise.all(history.map(async (item) => await item.getVisibleText()));
  }

  public async loadRequestFromHistory(index: number, andExcute: boolean = false) {
    const historyItem = await this.testSubjects.find(`historyItem-${index}`);
    await historyItem.click();

    if (andExcute) {
      await this.testSubjects.click('consoleHistoryAddAndRunButton');
    } else {
      await this.testSubjects.click('consoleHistoryApplyButton');
    }
  }

  public async clickClearHistory() {
    const clearHistoryButton = await this.testSubjects.find('consoleClearHistoryButton');
    await clearHistoryButton.click();

    await this.retry.waitFor('history to be cleared', async () => {
      const history = await this.getHistoryEntries();
      return history.length === 0;
    });
  }

  public async closeHistory() {
    const closeButton = await this.testSubjects.find('consoleHistoryCloseButton');
    await closeButton.click();
  }

  public async sleepForDebouncePeriod(milliseconds: number = 100) {
    // start to sleep after confirming JS engine responds
    await this.retry.waitFor('pinging JS engine', () => this.browser.execute('return true;'));
    await this.common.sleep(milliseconds);
  }

  async setAutocompleteTrace(flag: boolean) {
    await this.browser.execute((f: boolean) => {
      (window as any).autocomplete_trace = f;
    }, flag);
  }

  public async isOutputPanelEmptyStateVisible() {
    return await this.testSubjects.exists('consoleOutputPanelEmptyState');
  }
}
