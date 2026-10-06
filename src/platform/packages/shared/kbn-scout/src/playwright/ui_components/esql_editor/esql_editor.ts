/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';
import type { ScoutPage } from '../..';
import { KibanaCodeEditorWrapper } from '../monaco_editor';
import { LookupIndexEditor } from './lookup_index_editor';

const SELECT_SUGGESTION_TIMEOUT_MS = 30_000;
const SUGGESTION_ATTEMPT_TIMEOUT_MS = 2_000;

export interface EsqlControlOptions {
  variableName?: string;
  label?: string;
  /** Switches the control to static values and adds each one as a custom option. */
  values?: string[];
}

/**
 * UI component object for the ES|QL editor (`@kbn/esql-editor`), usable in any app that
 * embeds it: Discover, the Lens/Dashboard inline editor, Data Visualizer, and so on.
 *
 * Pass `containerTestSubj` (e.g. `InlineEditingESQLEditor`) to scope the editor and its
 * run button, footer and menu to one host when several editors can be on the page.
 * Popovers and flyouts it opens render in portals and are always looked up page-wide.
 *
 * @example
 * const { esqlEditor } = pageObjects;
 * await esqlEditor.setQuery('FROM logs-* | LIMIT 10');
 * await esqlEditor.runQuery();
 *
 * // Only when several editors are on the page at once:
 * await esqlEditor.inContainer('InlineEditingESQLEditor').setQuery('FROM logs-*');
 */
export class EsqlEditor {
  /** Root of the editor (`ESQLEditor`), wrapping the Monaco instance. */
  readonly editor: Locator;
  /** Rendered text lines; prefer {@link getQuery} unless asserting on what's displayed. */
  readonly content: Locator;
  /** Monaco's hidden textarea, e.g. for focus assertions. */
  readonly input: Locator;
  /** Run button; only rendered by inline editors (`editorIsInline`). */
  readonly runButton: Locator;
  readonly queryStatsTotalDocumentsProcessed: Locator;
  readonly queryStatsDuration: Locator;
  readonly menuPopover: Locator;
  readonly quickReferenceFlyout: Locator;
  readonly historyPanel: Locator;
  /** Lookup-join index editor flyout, opened from this editor. */
  readonly lookupIndexEditor: LookupIndexEditor;

  private readonly scope: Pick<Locator, 'getByTestId'>;
  private readonly codeEditor: KibanaCodeEditorWrapper;
  private readonly helpButton: Locator;
  private readonly historyToggle: Locator;
  private readonly resizeHandle: Locator;

  constructor(private readonly page: ScoutPage, containerTestSubj?: string) {
    this.scope = containerTestSubj ? page.testSubj.locator(containerTestSubj) : page;
    this.codeEditor = new KibanaCodeEditorWrapper(page);

    this.editor = this.scope.getByTestId('ESQLEditor');
    this.content = this.editor.locator('.view-lines');
    this.input = this.editor.locator('textarea');
    this.runButton = this.scope.getByTestId('ESQLEditor-run-query-button');
    this.queryStatsTotalDocumentsProcessed = this.scope.getByTestId(
      'ESQLEditor-queryStats-totalDocumentsProcessed'
    );
    this.queryStatsDuration = this.scope.getByTestId('ESQLEditor-queryStats-queryDuration');
    this.helpButton = this.scope.getByTestId('esql-help-popover-button');
    this.historyToggle = this.scope.getByTestId('ESQLEditor-toggle-query-history-icon');
    this.historyPanel = this.scope.getByTestId('ESQLEditor-history-container');
    this.resizeHandle = this.scope.getByTestId('ESQLEditor-resize');

    this.menuPopover = page.testSubj.locator('esql-menu-popover');
    this.quickReferenceFlyout = page.testSubj.locator('esqlInlineDocumentationFlyout');
    this.lookupIndexEditor = new LookupIndexEditor(page, this);
  }

  /** Returns an `EsqlEditor` scoped to the host element with the given `data-test-subj`. */
  inContainer(containerTestSubj: string): EsqlEditor {
    return new EsqlEditor(this.page, containerTestSubj);
  }

  /** Waits until the Monaco instance is mounted; its text model doesn't exist before that. */
  async waitReady(): Promise<void> {
    await this.editor.getByTestId('kibanaCodeEditor').waitFor({ state: 'visible' });
  }

  /** Replaces the query in this editor (and only this one) and returns the applied value. */
  async setQuery(query: string): Promise<string> {
    await this.waitReady();
    return this.codeEditor.setCodeEditorValueByContainer(this.editor, query);
  }

  async getQuery(): Promise<string> {
    await this.waitReady();
    return this.codeEditor.getCodeEditorValueByContainer(this.editor);
  }

  /**
   * Clicks the inline editor's run button, once it's enabled (Playwright's click waits
   * for that). Waiting for results is up to the host.
   */
  async runQuery(): Promise<void> {
    await this.runButton.click();
  }

  /** Sets the query and clicks the inline editor's run button. */
  async setQueryAndRun(query: string): Promise<void> {
    await this.setQuery(query);
    await this.runQuery();
  }

  /** Moves the cursor after `text` (if given) and opens Monaco's suggestion widget. */
  async triggerSuggest(text?: string): Promise<void> {
    const modelIndex = await this.codeEditor.getModelIndexByContainer(this.editor);
    await this.codeEditor.triggerSuggest(text, modelIndex);
  }

  getSuggestWidget(): Locator {
    return this.codeEditor.getCodeEditorSuggestWidget();
  }

  /**
   * Sets `query`, opens the suggestion widget at its end, and clicks the suggestion whose
   * label contains `label`.
   *
   * ES|QL re-validates the query asynchronously, so a suggest triggered too early can latch
   * Monaco onto a widget that never gets the suggestion. The whole trigger is retried
   * rather than just the wait.
   */
  async selectSuggestion(query: string, label: string): Promise<void> {
    await this.setQuery(query);

    const suggestion = this.getSuggestWidget().locator('.monaco-list-row', { hasText: label });
    const deadline = Date.now() + SELECT_SUGGESTION_TIMEOUT_MS;
    for (;;) {
      await this.triggerSuggest(query);
      try {
        await suggestion.waitFor({ state: 'visible', timeout: SUGGESTION_ATTEMPT_TIMEOUT_MS });
        break;
      } catch (error) {
        if (Date.now() >= deadline) {
          throw new Error(`ES|QL suggestion "${label}" did not appear for query "${query}"`, {
            cause: error,
          });
        }
      }
    }
    await suggestion.click();
  }

  /** Documentation panel shown next to the focused autocomplete suggestion. */
  getSuggestDetails(): Locator {
    return this.codeEditor.getSuggestDetailsContainer();
  }

  /**
   * Toggles the suggestion documentation panel with Monaco's default `Ctrl+Space`
   * keybinding (same on macOS), so it acts on the focused editor. A suggestion must be
   * focused first (e.g. `triggerSuggest()` then `ArrowDown`).
   */
  async toggleSuggestDetails(): Promise<void> {
    await this.page.keyboard.press('Control+Space');
  }

  /** Error markers (squiggly underlines) currently shown in this editor. */
  getErrorMarkers(): Locator {
    return this.editor.locator('.cdr.squiggly-error');
  }

  /**
   * Inline decoration rendered via `inlineClassName` (e.g. the lookup-join badges).
   * Monaco injects these as plain spans, so a CSS class is the only way to target them.
   */
  getDecoration(decorationClassName: string): Locator {
    return this.editor.locator(`.${decorationClassName}`);
  }

  /** Hovers an inline decoration and clicks the hover-popover row containing `optionText`. */
  async selectDecorationHoverOption(
    decorationClassName: string,
    optionText: string
  ): Promise<void> {
    const decoration = this.getDecoration(decorationClassName);
    await decoration.waitFor({ state: 'visible' });
    await this.codeEditor.selectDecorationHoverOption(decoration, optionText);
  }

  // ── Help menu ──────────────────────────────────────────────────────────────

  async openHelpMenu(): Promise<void> {
    if (!(await this.menuPopover.isVisible())) {
      await this.helpButton.click();
    }
    await this.menuPopover.waitFor({ state: 'visible' });
  }

  async openRecommendedQueriesPanel(): Promise<void> {
    await this.openHelpMenu();

    await this.page.testSubj.click('esql-recommended-queries');
    await this.page.testSubj.locator('contextMenuPanelTitleButton').waitFor({ state: 'visible' });
  }

  /** Picks a recommended query from the help menu. Waiting for results is up to the host. */
  async selectRecommendedQuery(queryLabel: string): Promise<void> {
    await this.openRecommendedQueriesPanel();

    const queryOption = this.menuPopover.getByRole('menuitem', {
      exact: true,
      name: queryLabel,
    });

    await queryOption.click();
  }

  async openQuickReferenceFlyout(): Promise<void> {
    await this.openHelpMenu();
    await this.page.testSubj.click('esql-quick-reference');
    await this.quickReferenceFlyout.waitFor({ state: 'visible' });
  }

  // ── Query history ──────────────────────────────────────────────────────────

  async isHistoryPanelOpen(): Promise<boolean> {
    return this.historyPanel
      .waitFor({ state: 'visible', timeout: 1_000 })
      .then(() => true)
      .catch(() => false);
  }

  async toggleHistoryPanel(): Promise<void> {
    const wasOpen = await this.isHistoryPanelOpen();
    await this.historyToggle.click();
    await this.historyPanel.waitFor({ state: wasOpen ? 'hidden' : 'visible' });
  }

  async openStarredQueriesTab(): Promise<void> {
    await this.scope.getByTestId('starred-queries-tab').click();
    await this.scope.getByTestId('ESQLEditor-starredQueries').waitFor({ state: 'visible' });
  }

  /** Row of the open history panel's History tab whose query is exactly `query`. */
  getHistoryRow(query: string): Locator {
    return this.getQueryListRow('ESQLEditor-queryHistory', query);
  }

  /** Row of the open history panel's Starred tab whose query is exactly `query`. */
  getStarredRow(query: string): Locator {
    return this.getQueryListRow('ESQLEditor-starredQueries', query);
  }

  /**
   * Runs the given query from the open history panel. The row's run button both loads
   * the query into the editor and submits it; waiting for results is up to the host.
   * Matches the row by query text rather than index, so callers don't depend on ordering.
   */
  async runHistoryQuery(query: string): Promise<void> {
    await this.getHistoryRow(query)
      .getByTestId('ESQLEditor-history-starred-queries-run-button')
      .click();
  }

  private getQueryListRow(listTestSubj: string, query: string): Locator {
    return this.scope
      .getByTestId(listTestSubj)
      .locator('tr')
      .filter({
        // Match the whole text of the query cell rather than `hasText` on the
        // row: that is a case-insensitive substring match over the timestamp and
        // action buttons too, so one query would also match a row whose query
        // merely contains it.
        has: this.page.testSubj.locator('queryString').getByText(query, { exact: true }),
      });
  }

  // ── Layout ─────────────────────────────────────────────────────────────────

  async getHeight(): Promise<number> {
    await this.editor.waitFor({ state: 'visible' });
    const box = await this.editor.boundingBox();
    if (!box) {
      throw new Error('Unable to measure ES|QL editor height');
    }
    return Math.round(box.height);
  }

  /** Drags the resize handle vertically by `distance` pixels. */
  async resizeBy(distance: number): Promise<void> {
    await this.resizeHandle.waitFor({ state: 'visible' });
    const box = await this.resizeHandle.boundingBox();
    if (!box) {
      throw new Error('Unable to find ES|QL editor resize handle');
    }
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX, startY + distance, { steps: 10 });
    await this.page.mouse.up();
  }

  // ── ES|QL controls ─────────────────────────────────────────────────────────

  /**
   * Creates an ES|QL control from the editor: types a query ending in a variable position,
   * picks "Create control" from the suggestion widget and saves the flyout. Waiting for the
   * control to render is up to the host.
   */
  async createControlFromEditorSuggestion(
    query: string,
    { variableName, label, values }: EsqlControlOptions = {}
  ): Promise<void> {
    await this.selectSuggestion(query, 'Create control');

    const flyout = this.page.testSubj.locator('create_esql_control_flyout');
    await flyout.waitFor({ state: 'visible' });

    if (variableName !== undefined) {
      await this.page.testSubj.fill('esqlVariableName', variableName);
    }
    if (label !== undefined) {
      await this.page.testSubj.fill('esqlControlLabel', label);
    }
    if (values) {
      await this.page.testSubj.locator('esqlControlTypeDropdown').click();
      await this.page.testSubj.locator('staticValues').click();
      const valuesComboBox = this.page.components.comboBox('esqlValuesOptions');
      for (const value of values) {
        await valuesComboBox.setCustomSelectedOptions([value]);
      }
    }

    // Save stays disabled until `available_options` is populated (see `formIsInvalid` in
    // esql/public/triggers/esql_controls/control_flyout/index.tsx), and the click waits for
    // it to become enabled. That means waiting on the control's own ES|QL query rather than
    // on rendering, so query latency sets the budget.
    await this.page.testSubj.locator('saveEsqlControlsFlyoutButton').click({ timeout: 30_000 });
    await flyout.waitFor({ state: 'hidden' });
  }
}
