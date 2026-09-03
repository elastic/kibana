/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compressToEncodedURIComponent } from 'lz-string';
import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class ConsolePage {
  public readonly inputEditor: Locator;
  public readonly outputEditor: Locator;
  public readonly inputEditorLines: Locator;
  public readonly outputEditorContent: Locator;
  public readonly editorTextArea: Locator;
  public readonly invalidSyntaxMarker: Locator;
  public readonly suggestWidget: Locator;
  public readonly suggestionLabels: Locator;
  public readonly detectedLinks: Locator;

  public readonly sendRequestButton: Locator;
  public readonly copyOutputButton: Locator;
  public readonly responseStatusBadge: Locator;
  public readonly clearInputButton: Locator;
  public readonly clearOutputButton: Locator;
  public readonly outputPanelEmptyState: Locator;
  public readonly requestInProgressBadge: Locator;
  public readonly editorContentSpinner: Locator;

  public readonly shellTabButton: Locator;
  public readonly configTabButton: Locator;
  public readonly historyTabButton: Locator;
  public readonly shellPanel: Locator;
  public readonly configPanel: Locator;
  public readonly historyPanel: Locator;

  public readonly skipTourButton: Locator;
  public readonly a11yOverlay: Locator;
  public readonly a11yOverlaySwitch: Locator;
  public readonly fontSizeInput: Locator;
  public readonly helpButton: Locator;
  public readonly helpPopoverContent: Locator;

  public readonly outputFilterButton: Locator;
  public readonly outputFilterInput: Locator;
  public readonly outputFilterApplyButton: Locator;
  public readonly outputFilterActiveIndicator: Locator;

  public readonly historyItems: Locator;
  public readonly clearHistoryButton: Locator;
  public readonly historyApplyButton: Locator;
  public readonly historyAddAndRunButton: Locator;

  public readonly contextMenuButton: Locator;
  public readonly contextMenu: Locator;
  public readonly copyAsMenuItem: Locator;
  public readonly selectLanguageMenuItem: Locator;
  public readonly openDocsMenuItem: Locator;
  public readonly autoIndentMenuItem: Locator;
  public readonly autoIndentShortcutBadge: Locator;
  public readonly openDocsShortcutBadge: Locator;
  public readonly setAsDefaultLanguageButton: Locator;
  public readonly copyAsLanguageSubmitButton: Locator;
  public readonly closeCopyAsModalButton: Locator;

  public readonly shortcutsButton: Locator;
  public readonly shortcutsPopoverContent: Locator;
  public readonly keyboardShortcutsSwitch: Locator;

  public readonly exportButton: Locator;
  public readonly importFileInput: Locator;
  public readonly confirmImportButton: Locator;

  public readonly variablesAddButton: Locator;
  public readonly variableNameField: Locator;
  public readonly variableValueField: Locator;
  public readonly addNewVariableButton: Locator;
  public readonly confirmModalConfirmButton: Locator;
  public readonly variablesTable: Locator;
  public readonly variableNameCells: Locator;

  public readonly runTourButton: Locator;
  public readonly nextTourStepButton: Locator;
  public readonly completeTourButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.inputEditor = this.page.testSubj.locator('consoleMonacoEditor');
    this.outputEditor = this.page.testSubj.locator('consoleMonacoOutput');
    this.inputEditorLines = this.inputEditor.locator('.view-lines');
    this.outputEditorContent = this.outputEditor.locator('.monaco-scrollable-element');
    this.editorTextArea = this.inputEditor.locator('textarea');
    this.invalidSyntaxMarker = this.inputEditor.locator('.squiggly-error');
    // The suggest widget renders into a portal outside the editor subtree (see
    // `OVERFLOW_WIDGETS_TEST_ID`), so it can't be scoped to `inputEditor`.
    this.suggestWidget = this.page.locator('.suggest-widget:visible');
    this.suggestionLabels = this.suggestWidget.locator('.monaco-list-row .label-name');
    this.detectedLinks = this.inputEditor.locator('.detected-link');

    this.sendRequestButton = this.page.testSubj.locator('sendRequestButton');
    this.copyOutputButton = this.page.testSubj.locator('copyOutputButton');
    this.responseStatusBadge = this.page.testSubj.locator('consoleResponseStatusBadge');
    this.clearInputButton = this.page.testSubj.locator('clearConsoleInput');
    this.clearOutputButton = this.page.testSubj.locator('clearConsoleOutput');
    this.outputPanelEmptyState = this.page.testSubj.locator('consoleOutputPanelEmptyState');
    this.requestInProgressBadge = this.page.testSubj.locator('consoleRequestInProgressBadge');
    this.editorContentSpinner = this.page.testSubj.locator('consoleEditorContentSpinner');

    this.shellTabButton = this.page.testSubj.locator('consoleShellButton');
    this.configTabButton = this.page.testSubj.locator('consoleConfigButton');
    this.historyTabButton = this.page.testSubj.locator('consoleHistoryButton');
    this.shellPanel = this.page.testSubj.locator('consoleEditorContainer');
    this.configPanel = this.page.testSubj.locator('consoleConfigPanel');
    this.historyPanel = this.page.testSubj.locator('consoleHistoryPanel');

    this.skipTourButton = this.page.testSubj.locator('consoleSkipTourButton');
    this.a11yOverlay = this.page.testSubj.locator('codeEditorAccessibilityOverlay');
    this.a11yOverlaySwitch = this.page.testSubj.locator('enableA11yOverlay');
    this.fontSizeInput = this.page.testSubj.locator('setting-font-size-input');
    this.helpButton = this.page.testSubj.locator('consoleHelpButton');
    // The popover has no test subj of its own; this button only exists while it is open.
    this.helpPopoverContent = this.page.testSubj.locator('consoleRunTourButton');

    this.outputFilterButton = this.page.testSubj.locator('consoleOutputFilterButton');
    // The filter input carries either test subj depending on the selected filter language.
    this.outputFilterInput = this.page.locator(
      '[data-test-subj="filterJq"], [data-test-subj="filterRegex"]'
    );
    this.outputFilterApplyButton = this.page.testSubj.locator('consoleOutputFilterApply');
    this.outputFilterActiveIndicator = this.page.testSubj.locator(
      'consoleOutputFilterActiveIndicator'
    );

    this.historyItems = this.page.testSubj.locator('historyItemFieldset');
    this.clearHistoryButton = this.page.testSubj.locator('consoleClearHistoryButton');
    this.historyApplyButton = this.page.testSubj.locator('consoleHistoryApplyButton');
    this.historyAddAndRunButton = this.page.testSubj.locator('consoleHistoryAddAndRunButton');

    this.contextMenuButton = this.page.testSubj.locator('toggleConsoleMenu');
    this.contextMenu = this.page.testSubj.locator('consoleMenu');
    this.copyAsMenuItem = this.page.testSubj.locator('consoleMenuCopyAsButton');
    this.selectLanguageMenuItem = this.page.testSubj.locator('consoleMenuSelectLanguage');
    this.openDocsMenuItem = this.page.testSubj.locator('consoleMenuOpenDocs');
    this.autoIndentMenuItem = this.page.testSubj.locator('consoleMenuAutoIndent');
    this.autoIndentShortcutBadge = this.page.testSubj.locator('consoleMenuAutoIndentShortcut');
    this.openDocsShortcutBadge = this.page.testSubj.locator('consoleMenuOpenDocsShortcut');
    this.setAsDefaultLanguageButton = this.page.testSubj.locator('setAsDefaultLanguage');
    this.copyAsLanguageSubmitButton = this.page.testSubj.locator('copyAsLanguageSubmit');
    this.closeCopyAsModalButton = this.page.testSubj.locator('closeCopyAsModal');

    this.shortcutsButton = this.page.testSubj.locator('consoleShortcutsButton');
    // The popover has no test subj of its own; this section title only exists while it is open.
    this.shortcutsPopoverContent = this.page.getByText('Navigation shortcuts');
    this.keyboardShortcutsSwitch = this.page.testSubj.locator('enableKeyboardShortcuts');

    this.exportButton = this.page.testSubj.locator('consoleExportButton');
    this.importFileInput = this.page.locator('#importConsoleFile');
    this.confirmImportButton = this.page.testSubj.locator('confirmModalConfirmButton');

    this.variablesAddButton = this.page.testSubj.locator('variablesAddButton');
    this.variableNameField = this.page.testSubj.locator('nameField');
    this.variableValueField = this.page.testSubj.locator('valueField');
    this.addNewVariableButton = this.page.testSubj.locator('addNewVariableButton');
    this.confirmModalConfirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
    this.variablesTable = this.page.testSubj.locator('variablesTable');
    this.variableNameCells = this.page.testSubj.locator('variableNameCell');

    this.runTourButton = this.page.testSubj.locator('consoleRunTourButton');
    this.nextTourStepButton = this.page.testSubj.locator('consoleNextTourStepButton');
    this.completeTourButton = this.page.testSubj.locator('consoleCompleteTourButton');
  }

  languageOption(language: string) {
    return this.page.testSubj.locator(`languageOption-${language}`);
  }

  variableCopyButton(name: string) {
    return this.page.testSubj.locator(`variableCopyButton-${name}`);
  }

  /**
   * The tour steps carry their `data-test-subj` on the popover anchor, which exists whether
   * the step is open or not, so the step is identified by the title it renders instead.
   */
  tourStepTitle(title: string) {
    return this.page.getByText(title, { exact: true });
  }

  async goto() {
    await this.page.gotoApp('dev_tools', { hash: 'console' });
    await this.inputEditor.waitFor({ state: 'visible' });
  }

  /**
   * Preloads a request through the `load_from` data URI ("Open in Console"), avoiding
   * autocomplete-prone typing. The appended request gets the cursor, so it can be sent.
   */
  async gotoWithRequestLoaded(request: string) {
    const encoded = compressToEncodedURIComponent(request);
    await this.page.gotoApp('dev_tools', {
      hash: `console/shell?load_from=data:text/plain,${encoded}`,
    });
    await this.inputEditor.waitFor({ state: 'visible' });
    await this.sendRequestButton.waitFor({ state: 'visible' });
  }

  /**
   * Navigates with an uncompressed `load_from` value, to exercise malformed deep links.
   * Targets `console/shell` directly: landing on `console` redirects there with the param
   * still attached, appending the value twice.
   */
  async gotoWithRawLoadFrom(loadFrom: string) {
    await this.page.gotoApp('dev_tools', { hash: `console/shell?load_from=${loadFrom}` });
  }

  /**
   * The onboarding tour covers the editor on a first visit. Best-effort: within the same
   * browser context later visits find it already dismissed.
   */
  async skipTourIfExists() {
    if (await this.skipTourButton.isVisible()) {
      await this.skipTourButton.click();
      await this.skipTourButton.waitFor({ state: 'hidden' });
    }
  }

  /**
   * Replaces the editor content by typing, at human speed: Console parses in a web worker
   * fed by Monaco's mirror model, and outrunning it makes `selectAllRequests()` send only
   * the last request. Long or JSON content goes to {@link replaceAllText}; use
   * {@link typeText} when the keystrokes themselves are under test.
   */
  async enterText(text: string) {
    if (text.length > 300 || text.includes('{')) {
      return this.replaceAllText(text);
    }
    const lines = text.split('\n');
    const charDelay = 60;
    // Keep the poll from timing out on typing speed alone.
    const timeout = Math.max(15000, text.length * (charDelay + 20) + lines.length * 4000);
    await expect
      .poll(
        async () => {
          await this.focusInputEditor();
          await this.editorTextArea.press('ControlOrMeta+a');
          for (const [index, line] of lines.entries()) {
            await this.editorTextArea.pressSequentially(line, { delay: charDelay });
            if (await this.suggestWidget.isVisible()) {
              await this.editorTextArea.press('Escape');
              await this.suggestWidget.waitFor({ state: 'hidden' });
              // If the widget closed first, the Escape left the editor's a11y edit mode
              // instead, and Console hides the send button on blur. Refocus via the
              // textarea: a margin click would move the cursor.
              await this.editorTextArea.focus();
            }
            if (index < lines.length - 1) {
              await this.pressNewline(index + 2);
            }
          }
          if ((await this.getEditorText()) === text.trim()) {
            return true;
          }
          // A soft-wrapped line reads back with a spurious `\n` at the wrap point, so
          // check the model itself before retyping everything.
          return (await this.getModelTextViaCopy()) === text.trim();
        },
        { timeout }
      )
      .toBe(true);
  }

  /**
   * Replaces the editor content in one paste, avoiding the per-keystroke completions that
   * can leave {@link enterText} stuck on JSON-heavy input. Unverified on purpose: content
   * taller than the viewport can't be read back reliably, so assert on follow-up UI instead.
   */
  async replaceAllText(text: string) {
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await this.focusInputEditor();
    await this.editorTextArea.press('ControlOrMeta+a');
    await this.page.evaluate((t) => navigator.clipboard.writeText(t), text);
    await this.editorTextArea.press('ControlOrMeta+v');
  }

  /**
   * Reads the model content via clipboard copy rather than the rendered DOM, restoring a
   * plain cursor afterwards. Fallback only: it changes the selection.
   */
  private async getModelTextViaCopy() {
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await this.editorTextArea.press('ControlOrMeta+a');
    await this.editorTextArea.press('ControlOrMeta+c');
    const clipboardText = await this.page.evaluate(() => navigator.clipboard.readText());
    await this.editorTextArea.press('ControlOrMeta+End');
    return clipboardText.replace(/\r\n/g, '\n').trim();
  }

  private async pressNewline(expectedMinLineCount: number) {
    await expect
      .poll(
        async () => {
          if ((await this.getModelLineCount()) < expectedMinLineCount) {
            await this.editorTextArea.press('Enter');
          }
          return this.getModelLineCount();
        },
        // A line dense with trigger characters can need many retries to land the Enter.
        { timeout: 20000 }
      )
      .toBeGreaterThanOrEqual(expectedMinLineCount);
  }

  /**
   * The line count from Monaco's own API. Prefer it over splitting {@link getEditorText},
   * which trims blank edges; both that and a `.view-line` count are also thrown off by
   * soft wrapping and by Monaco rendering only the visible lines.
   */
  async getModelLineCount(): Promise<number> {
    return this.inputEditor.evaluate((editorNode) => {
      const monacoGlobal = window.MonacoEnvironment?.monaco;
      const editor = monacoGlobal?.editor
        .getEditors()
        .find((e) => editorNode.contains(e.getContainerDomNode()));
      return editor?.getModel()?.getLineCount() ?? -1;
    });
  }

  /**
   * Monaco bumps this on every `executeEdits()`, including a no-op one, which lets a test
   * tell "the action ran and correctly changed nothing" from "the action never ran".
   */
  async getModelVersionId(): Promise<number> {
    return this.inputEditor.evaluate((editorNode) => {
      const monacoGlobal = window.MonacoEnvironment?.monaco;
      const editor = monacoGlobal?.editor
        .getEditors()
        .find((e) => editorNode.contains(e.getContainerDomNode()));
      return editor?.getModel()?.getVersionId() ?? -1;
    });
  }

  /**
   * Types text key by key so autocomplete, auto-indent and bracket closing all react.
   * Unlike {@link enterText} it never dismisses the suggest widget, since callers use this
   * to exercise autocomplete; the delay and retried newlines are needed for the same
   * reasons as there.
   */
  async typeText(text: string) {
    await this.focusInputEditor();
    const lines = text.split('\n');
    const startingLineCount = await this.getModelLineCount();
    for (const [index, line] of lines.entries()) {
      await this.editorTextArea.pressSequentially(line, { delay: 60 });
      if (index < lines.length - 1) {
        await this.pressNewline(startingLineCount + index + 1);
      }
    }
  }

  /**
   * Leaves the editor holding a request the Console parser always rejects, to reach a known
   * "has syntax errors" state — see `lib/syntax_validation.ts`.
   */
  async enterSyntaxErrorSentinel() {
    await this.clearEditorText();
    await this.focusInputEditor();
    await this.page.keyboard.insertText('$');
  }

  async getEditorText() {
    // Monaco renders spaces as non-breaking; normalize them back.
    return (await this.inputEditorLines.innerText()).replace(/\u00A0/g, ' ').trim();
  }

  async getOutputText() {
    return (await this.outputEditorContent.innerText()).replace(/\u00A0/g, ' ');
  }

  /**
   * Uses the "Clear this input" button: Console's autosave-restore puts the default welcome
   * text back after a plain Ctrl+A + Delete.
   */
  async clearEditorText() {
    await this.clickClearInput();
    await expect.poll(() => this.getEditorText()).toBe('');
  }

  /**
   * Triggers Monaco's own select-all command: a real Ctrl+A can hit the browser's native
   * textarea select-all instead, which covers only Monaco's mirrored window.
   */
  async selectAllRequests() {
    await this.focusInputEditor();
    await this.inputEditor.evaluate((editorNode) => {
      const monacoGlobal = window.MonacoEnvironment?.monaco;
      const editor = monacoGlobal?.editor
        .getEditors()
        .find((e) => editorNode.contains(e.getContainerDomNode()));
      editor?.trigger('scoutTest', 'editor.action.selectAll', null);
    });
  }

  /**
   * If the debounced request highlight ran while the editor was briefly blurred, the send
   * button stays hidden until the next selection event — so re-fire it until it shows.
   */
  async clickPlay() {
    await expect
      .poll(async () => {
        if (await this.sendRequestButton.isVisible()) {
          return true;
        }
        await this.nudgeRequestSelection();
        return this.sendRequestButton.isVisible();
      })
      .toBe(true);
    await this.sendRequestButton.click();
  }

  /** Restores focus and re-fires the selection listener without changing the selection. */
  private async nudgeRequestSelection() {
    await this.inputEditor.evaluate((editorNode) => {
      const editor = window.MonacoEnvironment?.monaco?.editor
        .getEditors()
        .find((e) => editorNode.contains(e.getContainerDomNode()));
      const selection = editor?.getSelection();
      if (!editor || !selection) {
        return;
      }
      editor.focus();
      const column = selection.positionColumn > 1 ? selection.positionColumn - 1 : 2;
      editor.setSelection({
        selectionStartLineNumber: selection.positionLineNumber,
        selectionStartColumn: column,
        positionLineNumber: selection.positionLineNumber,
        positionColumn: column,
      });
      editor.setSelection(selection);
    });
  }

  async sendRequest() {
    await this.clickPlay();
    await this.waitForRequestToComplete();
  }

  async waitForRequestToComplete() {
    await this.editorContentSpinner.waitFor({ state: 'hidden' });
    await this.requestInProgressBadge.waitFor({ state: 'hidden' });
    await this.responseStatusBadge.waitFor({ state: 'visible' });
  }

  async getResponseStatus() {
    const text = (await this.responseStatusBadge.innerText()).trim();
    return Number(text.replace(/[^\d]+/g, ''));
  }

  async responseHasDeprecationWarning() {
    return (await this.getOutputText()).trim().startsWith('#!');
  }

  async clickClearInput() {
    await this.clearInputButton.click();
  }

  async clickClearOutput() {
    await this.clearOutputButton.click();
  }

  async selectOutput() {
    await this.focusEditor(this.outputEditor);
    await this.copyOutputButton.waitFor({ state: 'visible' });
  }

  /**
   * Console scrolls the output editor back to its first line on a multi-request response, so
   * the later responses aren't in the DOM until this has run.
   */
  async scrollOutputToBottom() {
    await this.outputEditorContent.hover();
    await expect(async () => {
      const before = await this.outputEditorContent.evaluate((el) => el.scrollTop);
      await this.page.mouse.wheel(0, 5000);
      const after = await this.outputEditorContent.evaluate((el) => el.scrollTop);
      expect(after).toBe(before);
    }).toPass({ timeout: 10_000 });
  }

  /**
   * Clicks copy-output at human speed (mouse down, hold, release). A fast synthetic click
   * wins the blur-hide race of https://github.com/elastic/kibana/issues/266698 and so
   * cannot detect it.
   */
  async slowClickCopyOutput(holdMs: number) {
    await this.copyOutputButton.click({ delay: holdMs });
  }

  async openShellTab() {
    await this.shellTabButton.click();
    await this.shellPanel.waitFor({ state: 'visible' });
  }

  async openConfigTab() {
    await this.configTabButton.click();
    await this.configPanel.waitFor({ state: 'visible' });
  }

  async openHistoryTab() {
    await this.historyTabButton.click();
    await this.historyPanel.waitFor({ state: 'visible' });
  }

  /**
   * Waits for the persisted value rather than a fixed sleep: settings save on a 500ms
   * debounce (`DEBOUNCE_DELAY` in `settings_editor.tsx`), and navigating away before it
   * fires unmounts the editor and drops the change.
   */
  async setA11yOverlayEnabled(enabled: boolean) {
    // EuiSwitch renders a `role=switch` button carrying the test subj, no inner input.
    const isEnabled = (await this.a11yOverlaySwitch.getAttribute('aria-checked')) === 'true';
    if (isEnabled !== enabled) {
      await this.a11yOverlaySwitch.click();
      await expect
        .poll(() =>
          this.page.evaluate(() => localStorage.getItem('sense:is_accessibility_overlay_enabled'))
        )
        .toBe(String(enabled));
    }
  }

  /** Same debounced save as {@link setA11yOverlayEnabled}. */
  async setFontSize(size: number) {
    await this.fontSizeInput.fill(String(size));
    await expect
      .poll(() => this.page.evaluate(() => localStorage.getItem('sense:font_size')))
      .toBe(String(size));
  }

  /** The font size Monaco actually applies to the input editor. */
  async getEditorFontSize() {
    return await this.inputEditorLines.evaluate(
      (element) => window.getComputedStyle(element).fontSize
    );
  }

  async toggleHelpPopover() {
    await this.helpButton.click();
  }

  async pressEscapeInEditor() {
    await this.focusInputEditor();
    await this.editorTextArea.press('Escape');
  }

  async pressEnterInEditor() {
    await this.focusInputEditor();
    await this.editorTextArea.press('Enter');
  }

  async toggleOutputFilterRow() {
    await this.outputFilterButton.click();
  }

  async setOutputFilter(expression: string) {
    await this.outputFilterInput.fill(expression);
    await this.outputFilterApplyButton.click();
  }

  /**
   * A reload restores the debounced localStorage copy of the editor content, so wait for
   * the snippet to land there instead of sleeping.
   */
  async waitForEditorContentPersisted(snippet: string) {
    await this.page.waitForFunction(
      (needle) =>
        Object.keys(window.localStorage).some(
          (key) =>
            key.startsWith('sense:') && (window.localStorage.getItem(key) ?? '').includes(needle)
        ),
      snippet
    );
  }

  async loadRequestFromHistory(index: number, andExecute: boolean = false) {
    await this.page.testSubj.locator(`historyItem-${index}`).click();
    if (andExecute) {
      await this.historyAddAndRunButton.click();
    } else {
      await this.historyApplyButton.click();
    }
  }

  async clearHistory() {
    await this.clearHistoryButton.click();
  }

  /** The labels currently offered by the autocomplete widget, in the order shown. */
  async getAutocompleteSuggestions() {
    return await this.suggestionLabels.allInnerTexts();
  }

  async acceptAutocompleteSuggestion() {
    await this.editorTextArea.press('Enter');
  }

  /** Asks Monaco for suggestions explicitly, bypassing the debounced automatic trigger. */
  async requestAutocompleteSuggestions() {
    await this.editorTextArea.press('ControlOrMeta+Space');
  }

  /**
   * Outlasts the trailing debounce autocomplete opens on
   * (`DEBOUNCE_AUTOCOMPLETE_WAIT_MS`), so that assertions about the widget staying closed
   * can't pass before it could ever have opened. Necessarily a fixed wait — there's no UI
   * signal for "the debounce elapsed without scheduling a suggestion" — but on the page's
   * clock, so it tracks the browser being paused.
   */
  async waitForAutocompleteTriggerWindow() {
    const deadline = (await this.page.evaluate(() => performance.now())) + 1500;
    await this.page.waitForFunction((until) => performance.now() >= until, deadline);
  }

  async openContextMenu() {
    await this.contextMenuButton.click();
    await this.contextMenu.waitFor({ state: 'visible' });
  }

  /** Opens the "Copy as" language selector from the context menu. */
  async openLanguageSelector() {
    await this.selectLanguageMenuItem.click();
  }

  async pickLanguage(language: string) {
    await this.languageOption(language).click();
  }

  async toggleShortcutsPopover() {
    await this.shortcutsButton.click();
  }

  /**
   * Keyboard shortcuts are a Console setting, so this takes a round trip through the Config
   * tab. Same debounced save as {@link setA11yOverlayEnabled}.
   */
  async setKeyboardShortcutsEnabled(enabled: boolean) {
    await this.openConfigTab();
    const isEnabled = (await this.keyboardShortcutsSwitch.getAttribute('aria-checked')) === 'true';
    if (isEnabled !== enabled) {
      await this.keyboardShortcutsSwitch.click();
      await expect
        .poll(() =>
          this.page.evaluate(() => localStorage.getItem('sense:is_keyboard_shortcuts_enabled'))
        )
        .toBe(String(enabled));
    }
    await this.openShellTab();
  }

  /**
   * Presses a Monaco `editor.addAction()` keybinding, always as `Control`: Scout's
   * `Desktop Chrome` profile reports a Windows user agent on any host, so Monaco binds
   * `CtrlCmd` to Control while Playwright's `ControlOrMeta` would send Meta on a Mac and
   * silently no-op.
   */
  async pressShortcut(shortcut: string) {
    // Refocus only when needed: a margin click would reposition the cursor and undo a move
    // made by a previous call (e.g. Ctrl+Up).
    if (!(await this.editorTextArea.evaluate((el) => el === document.activeElement))) {
      await this.focusInputEditor();
    }
    const normalized = shortcut.replace('ControlOrMeta', 'Control');

    // Ctrl+Up/Down await a parsed-requests lookup before moving the cursor, which `press()`
    // doesn't wait for, so a following action can race a move that hasn't landed.
    if (normalized.includes('ArrowUp') || normalized.includes('ArrowDown')) {
      const startingLine = await this.getCursorLineNumber();
      await expect
        .poll(async () => {
          if ((await this.getCursorLineNumber()) === startingLine) {
            await this.editorTextArea.press(normalized);
          }
          return this.getCursorLineNumber();
        })
        .not.toBe(startingLine);
      return;
    }

    await this.editorTextArea.press(normalized);
  }

  private async getCursorLineNumber(): Promise<number> {
    return this.inputEditor.evaluate((editorNode) => {
      const monacoGlobal = window.MonacoEnvironment?.monaco;
      const editor = monacoGlobal?.editor
        .getEditors()
        .find((e) => editorNode.contains(e.getContainerDomNode()));
      return editor?.getPosition()?.lineNumber ?? -1;
    });
  }

  /** Imports `content` through the Console import button, from memory rather than disk. */
  async importFile(fileName: string, content: string) {
    await this.importFileInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from(content, 'utf8'),
    });
    await this.confirmImportButton.click();
  }

  async addVariable({ name, value }: { name: string; value: string }) {
    await this.variablesAddButton.click();
    await this.variableNameField.fill(name);
    await this.variableValueField.fill(value);
    await this.addNewVariableButton.click();
  }

  async removeVariable(name: string) {
    const row = this.variablesTable.locator('tr', { hasText: `\${${name}}` });
    await row.locator('[data-test-subj="variablesRemoveButton"]').click();
    await this.confirmModalConfirmButton.click();
  }

  async getVariableNames() {
    // EuiCode appends a literal soft-wrap indicator on a new line when the cell is too
    // narrow, which `.trim()` won't remove. The name is always the first line.
    return (await this.variableNameCells.allInnerTexts()).map((text) => text.split('\n')[0]);
  }

  /** Starts the onboarding tour from the help popover. */
  async runTour() {
    await this.toggleHelpPopover();
    await this.runTourButton.click();
  }

  private async focusInputEditor() {
    await this.focusEditor(this.inputEditor);
  }

  /**
   * Focuses a Monaco editor by clicking its line-number margin, since its overlay layers
   * swallow clicks on the container. On first use `@kbn/code-editor`'s a11y hint covers the
   * margin; it's dismissed on failure rather than up front, because once dismissed it stays
   * in the DOM but no longer on top, and clicking it then hangs.
   */
  private async focusEditor(editor: Locator) {
    const margin = editor.locator('.margin-view-overlays');
    try {
      await margin.click({ timeout: 3000 });
    } catch {
      await editor.locator('[data-test-subj="codeEditorHint"]').click();
      await margin.click();
    }
  }
}
