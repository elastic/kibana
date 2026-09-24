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
import { expect } from '../../../../ui';
import { KibanaCodeEditorWrapper } from '../monaco_editor';
import { LookupIndexEditor } from './lookup_index_editor';

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
    await expect(this.editor.getByTestId('kibanaCodeEditor')).toBeVisible();
  }

  /** Replaces the query in this editor (and only this one) and returns the applied value. */
  async setQuery(query: string): Promise<string> {
    await this.waitReady();
    const modelIndex = await this.codeEditor.getModelIndexByContainer(this.editor);
    return this.codeEditor.setCodeEditorValue(query, modelIndex);
  }

  async getQuery(): Promise<string> {
    await this.waitReady();
    const modelIndex = await this.codeEditor.getModelIndexByContainer(this.editor);
    return this.codeEditor.getCodeEditorValue(modelIndex);
  }

  /** Clicks the inline editor's run button. Waiting for results is up to the host. */
  async runQuery(): Promise<void> {
    await expect(this.runButton).toBeEnabled();
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

  /** Error markers (squiggly underlines) currently shown in this editor. */
  getErrorMarkers(): Locator {
    return this.editor.locator('.cdr.squiggly-error');
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

    const recommendedQueriesButton = this.page.testSubj.locator('esql-recommended-queries');
    await expect(recommendedQueriesButton).toBeVisible();
    await recommendedQueriesButton.click();
    await this.page.testSubj.locator('contextMenuPanelTitleButton').waitFor({ state: 'visible' });
  }

  /** Picks a recommended query from the help menu. Waiting for results is up to the host. */
  async selectRecommendedQuery(queryLabel: string): Promise<void> {
    await this.openRecommendedQueriesPanel();

    const queryOption = this.menuPopover.getByRole('menuitem', {
      exact: true,
      name: queryLabel,
    });

    await expect(queryOption).toBeVisible();
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

  /**
   * Runs the given query from the open history panel. The row's run button both loads
   * the query into the editor and submits it; waiting for results is up to the host.
   * Matches the row by query text rather than index, so callers don't depend on ordering.
   */
  async runHistoryQuery(query: string): Promise<void> {
    const row = this.scope
      .getByTestId('ESQLEditor-queryHistory')
      .locator('tr')
      .filter({
        // Match the whole text of the query cell rather than `hasText` on the
        // row: that is a case-insensitive substring match over the timestamp and
        // action buttons too, so one query would also match a row whose query
        // merely contains it.
        has: this.page.testSubj.locator('queryString').getByText(query, { exact: true }),
      });
    await row.getByTestId('ESQLEditor-history-starred-queries-run-button').click();
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
    await this.setQuery(query);
    await this.triggerSuggest(query);

    const suggestionWidget = this.getSuggestWidget();
    await suggestionWidget.waitFor({ state: 'visible' });
    await suggestionWidget.locator('.monaco-list-row', { hasText: 'Create control' }).click();

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
