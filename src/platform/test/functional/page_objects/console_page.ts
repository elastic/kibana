/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asyncForEach } from '@kbn/std';
import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class ConsolePageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly find = this.ctx.getService('find');
  private readonly common = this.ctx.getPageObject('common');
  private readonly browser = this.ctx.getService('browser');
  private readonly monacoEditor = this.ctx.getService('monacoEditor');

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

  public async clearEditorText() {
    await this.monacoEditor.clearCodeEditorValue('consoleMonacoEditor');
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

  public async scrollOutputToTop() {
    await this.monacoEditor.simulateKeyCommand('consoleMonacoOutput', 'cursorTop');
  }

  public async selectAllOutputText() {
    await this.monacoEditor.simulateKeyCommand('consoleMonacoOutput', 'selectAll');
  }

  public async getOutputText() {
    return await this.monacoEditor.getCodeEditorValueByTestSubj('consoleMonacoOutput');
  }

  public async pressEnter() {
    await this.monacoEditor.appendToCodeEditor('consoleMonacoEditor', '\n');
  }

  public async acceptAutocompleteSuggestion() {
    await this.monacoEditor.simulateKeyCommand('consoleMonacoEditor', 'acceptSelectedSuggestion');
  }

  public async enterText(text: string) {
    if (!text) return;
    await this.monacoEditor.appendToCodeEditor('consoleMonacoEditor', text);
    const trimmed = text.trimStart();
    const isComment =
      trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*');
    if (!text.includes('\n') && !isComment) {
      // Single-line non-comment text: the user is typing within a line and may expect
      // autocomplete to evaluate. Multi-line text and comments are always setup/context —
      // no completion needed. For comments, triggerSuggest would bypass Monaco's
      // language-aware suppression and incorrectly show the widget inside comment lines.
      await this.monacoEditor.triggerSuggest('consoleMonacoEditor');
    }
  }

  /**
   * Explicitly ask Monaco to evaluate completions at the current cursor position,
   * without inserting any text. Use this after multi-line enterText calls where
   * the ending text is a trigger character (e.g. triple-quote for ESQL).
   */
  public async triggerSuggest() {
    await this.monacoEditor.triggerSuggest('consoleMonacoEditor');
  }

  public async appendText(text: string) {
    await this.monacoEditor.appendToCodeEditor('consoleMonacoEditor', text);
  }

  public async promptAutocomplete(letter = 'b') {
    await this.monacoEditor.appendToCodeEditor('consoleMonacoEditor', letter);
    await this.monacoEditor.triggerSuggest('consoleMonacoEditor');
    await this.retry.waitFor(
      'autocomplete to be visible',
      async () => await this.isAutocompleteVisible()
    );
  }

  public async isAutocompleteVisible() {
    const element = await this.find.byClassName('suggest-widget').catch(() => null);
    if (!element) return false;

    return await element.isDisplayed();
  }

  public async getAutocompleteSuggestion(index: number) {
    await this.retry.waitFor('suggestions widget has items', async () => {
      if (!(await this.isAutocompleteVisible())) return false;
      const widget = await this.find.byClassName('suggest-widget').catch(() => null);
      if (!widget) return false;
      const items = await widget.findAllByClassName('monaco-list-row');
      return items.length > 0;
    });

    const suggestionsWidget = await this.find.byClassName('suggest-widget');
    const suggestions = await suggestionsWidget.findAllByClassName('monaco-list-row');
    const suggestion = suggestions[index];
    if (!suggestion) {
      return undefined;
    }
    const label = await suggestion.findByClassName('label-name');
    return label.getVisibleText();
  }

  public async getAllAutocompleteSuggestions() {
    const suggestionsWidget = await this.find.byClassName('suggest-widget');
    const suggestions = await suggestionsWidget.findAllByClassName('monaco-list-row');
    const labels = await Promise.all(
      suggestions.map(async (suggestion) => {
        const label = await suggestion.findByClassName('label-name');
        return label.getVisibleText();
      })
    );
    return labels;
  }

  public async pressUp(shift: boolean = false) {
    await this.monacoEditor.simulateKeyCommand(
      'consoleMonacoEditor',
      shift ? 'cursorUpSelect' : 'cursorUp'
    );
  }

  public async pressDown(shift: boolean = false) {
    await this.monacoEditor.simulateKeyCommand(
      'consoleMonacoEditor',
      shift ? 'cursorDownSelect' : 'cursorDown'
    );
  }

  public async pressRight(shift: boolean = false) {
    await this.monacoEditor.simulateKeyCommand(
      'consoleMonacoEditor',
      shift ? 'cursorRightSelect' : 'cursorRight'
    );
  }

  public async pressLeft(shift: boolean = false) {
    await this.monacoEditor.simulateKeyCommand(
      'consoleMonacoEditor',
      shift ? 'cursorLeftSelect' : 'cursorLeft'
    );
  }

  public async pressCtrlSpace() {
    await this.triggerSuggest();
  }

  public async pressCtrlEnter() {
    await this.monacoEditor.simulateKeyCommand('consoleMonacoEditor', 'sendRequest');
  }

  public async pressCtrlI() {
    await this.monacoEditor.simulateKeyCommand('consoleMonacoEditor', 'autoIndent');
  }

  public async pressCtrlUp() {
    await this.monacoEditor.simulateKeyCommand('consoleMonacoEditor', 'moveUp');
  }

  public async pressCtrlDown() {
    await this.monacoEditor.simulateKeyCommand('consoleMonacoEditor', 'moveDown');
  }

  public async pressCtrlL() {
    await this.monacoEditor.simulateKeyCommand('consoleMonacoEditor', 'moveToLine');
  }

  public async pressCtrlSlash() {
    await this.monacoEditor.simulateKeyCommand('consoleMonacoEditor', 'openDocs');
  }

  public async pressEscape() {
    await this.monacoEditor.simulateKeyCommand('consoleMonacoEditor', 'Escape');
  }

  public async selectAllRequests() {
    await this.monacoEditor.selectAllCodeEditorValue('consoleMonacoEditor');
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

  public async copyRequestsToClipboard() {
    // Ctrl+A / Ctrl+C on the textarea no longer works reliably in Monaco 0.54 EditContext mode,
    // so we read the value via the Monaco API and write it to the clipboard programmatically.
    const content = await this.monacoEditor.getCodeEditorValueByTestSubj('consoleMonacoEditor');
    const clipboardError = await this.browser.executeAsync(
      (text: string, done: (errorMessage: string | null) => void) => {
        navigator.clipboard
          .writeText(text)
          .then(() => done(null))
          .catch((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error);
            done(errorMessage);
          });
      },
      content
    );

    if (clipboardError) {
      throw new Error(`Failed to copy requests to clipboard: ${clipboardError}`);
    }
  }

  public async isA11yOverlayVisible() {
    return await this.testSubjects.exists('codeEditorAccessibilityOverlay');
  }

  public async clickPlay() {
    await this.testSubjects.click('sendRequestButton');
  }

  public async clickPlayAndWaitForResults() {
    await this.clickPlay();

    // Try to catch the in-flight loading state. Fast requests (or identical repeated requests)
    // may complete before we poll, so we tolerate never seeing the loading indicators — as long
    // as output and a status badge are present when we check.
    await this.retry
      .tryForTime(5000, async () => {
        const inFlight =
          (await this.testSubjects.exists('consoleEditorContentSpinner')) ||
          (await this.testSubjects.exists('consoleRequestInProgressBadge'));
        if (!inFlight) throw new Error('Waiting for request to start');
      })
      .catch(async () => {
        // We didn't catch the in-progress state — verify that output is already available,
        // which means the request completed before we could observe it loading.
        if (
          !(await this.testSubjects.exists('consoleMonacoOutput')) ||
          !(await this.testSubjects.exists('consoleResponseStatusBadge'))
        ) {
          throw new Error('Console request did not start or produce output');
        }
      });

    // Wait for loading indicators to clear and output to be present.
    await this.waitForRequestToComplete();
  }

  public async waitForRequestToComplete() {
    await this.retry.try(async () => {
      const inProgress =
        (await this.testSubjects.exists('consoleEditorContentSpinner')) ||
        (await this.testSubjects.exists('consoleRequestInProgressBadge'));
      const outputReady = await this.testSubjects.exists('consoleMonacoOutput');
      const statusReady = await this.testSubjects.exists('consoleResponseStatusBadge');

      if (inProgress || !outputReady || !statusReady) {
        throw new Error('Expected console request to finish and render output');
      }
    });
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

  public async isTourPopoverOpen() {
    return this.testSubjects.isDisplayed('consoleSkipTourButton');
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

  public async clickRunTour() {
    await this.testSubjects.click('consoleRunTourButton');
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

  public async toggleA11yOverlaySetting(enabled: boolean) {
    await this.testSubjects.waitForEnabled('enableA11yOverlay');
    await this.testSubjects.setEuiSwitch('enableA11yOverlay', enabled ? 'check' : 'uncheck');
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
    await this.testSubjects.waitForEnabled('enableKeyboardShortcuts');
    await this.testSubjects.setEuiSwitch('enableKeyboardShortcuts', enabled ? 'check' : 'uncheck');
  }

  public async setKeyboardShortcutsEnabled(enabled: boolean) {
    await this.openConfig();
    await this.toggleKeyboardShortcuts(enabled);
    // The sleep is necessary to allow the switch state to be propagated
    await this.common.sleep(500);
    await this.openConsole();
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
    const tourShown = await this.testSubjects.exists('consoleSkipTourButton');
    if (tourShown) {
      await this.clickSkipTour();
    }
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

  public async isSelectLanguageButtonVisible() {
    return await this.testSubjects.exists('consoleMenuSelectLanguage');
  }

  public async clickCopyAsCurlButton() {
    const button = await this.testSubjects.find('consoleMenuCopyAsCurl');
    await button.click();
  }

  public async changeLanguageAndCopy(language: string) {
    // Open the language selector modal from the context menu
    await this.testSubjects.click('consoleMenuSelectLanguage');

    const changeLangButton = await this.testSubjects.find(`languageOption-${language}`);
    await changeLangButton.click();

    const submitButton = await this.testSubjects.find('copyAsLanguageSubmit');
    await submitButton.click();
  }

  public async changeDefaultLanguage(language: string) {
    // Open the language selector modal from the context menu
    await this.testSubjects.click('consoleMenuSelectLanguage');

    const changeLangButton = await this.testSubjects.find(`languageOption-${language}`);
    await changeLangButton.click();

    // Mark the selected language as the new default
    await this.testSubjects.click('setAsDefaultLanguage');

    // Close the modal — this persists the new default to storage
    const closeModalButton = await this.testSubjects.find('closeCopyAsModal');
    await closeModalButton.click();
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

  public async clickOutputFilterButton() {
    await this.testSubjects.click('consoleOutputFilterButton');
  }

  public async isOutputFilterRowVisible() {
    return (
      (await this.testSubjects.exists('filterJq')) ||
      (await this.testSubjects.exists('filterRegex'))
    );
  }

  public async typeInFilterInput(text: string) {
    const testSubj = (await this.testSubjects.exists('filterJq')) ? 'filterJq' : 'filterRegex';
    const input = await this.testSubjects.find(testSubj);
    await input.clearValueWithKeyboard();
    await input.type(text);
  }

  public async submitFilter() {
    await this.testSubjects.click('consoleOutputFilterApply');
  }

  public async isOutputFilterButtonActive() {
    const button = await this.testSubjects.find('consoleOutputFilterButton');
    const wrapper = await button.findByXpath('..');
    // The dot indicator is a sibling span inside the wrapper div
    const children = await wrapper.findAllByCssSelector('span[style*="border-radius"]');
    return children.length > 0;
  }
}
