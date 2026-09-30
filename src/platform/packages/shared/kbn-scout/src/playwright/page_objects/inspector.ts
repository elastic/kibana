/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';
import type { ScoutPage } from '..';
import { AppMenu } from './app_menu';
import { KibanaCodeEditorWrapper } from '../ui_components';

export class InspectorPage {
  private readonly appMenu: AppMenu;
  public readonly panel: Locator;
  public readonly closeButton: Locator;
  public readonly viewChooser: Locator;
  public readonly tablePaginationPopoverButton: Locator;
  public readonly searchSessionId: Locator;
  private readonly codeEditor: KibanaCodeEditorWrapper;

  public readonly requests: {
    readonly requestChooser: Locator;
    readonly documentsRequest: Locator;
    readonly statisticsTab: Locator;
    readonly requestTab: Locator;
    readonly responseTab: Locator;
    readonly timestamp: Locator;
    readonly codeViewer: Locator;
  };

  constructor(private readonly page: ScoutPage) {
    this.appMenu = new AppMenu(page);
    this.codeEditor = new KibanaCodeEditorWrapper(this.page);
    this.panel = page.testSubj.locator('inspectorPanel');
    this.closeButton = page.testSubj.locator('euiFlyoutCloseButton');
    this.viewChooser = page.testSubj.locator('inspectorViewChooser');
    this.tablePaginationPopoverButton = page.testSubj.locator('tablePaginationPopoverButton');
    this.searchSessionId = page.testSubj.locator('inspectorRequestSearchSessionId');

    this.requests = {
      requestChooser: page.testSubj.locator('inspectorRequestChooser'),
      documentsRequest: page.testSubj.locator('inspectorRequestChooserDocuments'),
      statisticsTab: page.testSubj.locator('inspectorRequestDetailStatistics'),
      requestTab: page.testSubj.locator('inspectorRequestDetailRequest'),
      responseTab: page.testSubj.locator('inspectorRequestDetailResponse'),
      timestamp: page.testSubj.locator('inspector.statistics.requestTimestamp'),
      codeViewer: page.testSubj.locator('inspectorRequestCodeViewerContainer'),
    };
  }

  /**
   * Opens the inspector panel. Guards against re-opening if already visible.
   * Handles the overflow menu when the open button is collapsed.
   *
   * @param openButtonTestSubj - `data-test-subj` of the button that opens the inspector.
   *   Defaults to `'openInspectorButton'`.
   */
  async open(openButtonTestSubj: string = 'openInspectorButton') {
    if (await this.panel.isVisible()) {
      return;
    }
    await this.appMenu.clickItem(openButtonTestSubj);
    await this.panel.waitFor({ state: 'visible' });
  }

  async setTablePageSize(size: number) {
    await this.tablePaginationPopoverButton.click();
    const option = this.page.testSubj.locator(`tablePagination-${size}-rows`);
    await option.click();
    // Wait for the page-size popover to close before callers read the table.
    await option.waitFor({ state: 'hidden' });
  }

  /** Switches the inspector table to the given 0-based page and waits until it is current. */
  async goToTablePage(pageIndex: number) {
    const pageButton = this.page.testSubj.locator(`pagination-button-${pageIndex}`);
    await pageButton.click();
    await this.page
      .locator(`[data-test-subj="pagination-button-${pageIndex}"][aria-current="page"]`)
      .waitFor({ state: 'visible' });
  }

  /**
   * Closes the inspector panel. No-ops if already closed.
   */
  async close() {
    if (!(await this.panel.isVisible())) {
      return;
    }
    await this.closeButton.click();
    await this.panel.waitFor({ state: 'hidden' });
  }

  async getRequestTimestamp(): Promise<string> {
    await this.panel.waitFor({ state: 'visible' });
    return this.requests.timestamp.innerText();
  }

  /**
   * Opens a specific inspector view by name (e.g. `'Requests'`, `'Data'`).
   * No-ops when the inspector renders only a single view (no view chooser).
   */
  async openInspectorView(viewId: string) {
    await this.panel.waitFor({ state: 'visible' });
    if (!(await this.viewChooser.isVisible())) {
      return;
    }
    await this.viewChooser.click();
    const item = this.page.testSubj.locator(`inspectorViewChooser${viewId}`);
    await item.waitFor({ state: 'visible' });
    await item.click();
  }

  /**
   * Switches the inspector to its Requests view.
   * No-ops when the inspector renders only a single view (no view chooser).
   */
  async openInspectorRequestsView() {
    await this.openInspectorView('Requests');
  }

  /**
   * The search session id surfaced by the open inspector's Requests view.
   * Switches to the Requests view, reads the id, then closes the inspector.
   * Throws if no id is present — a missing id means the assertion would be meaningless.
   */
  async getSearchSessionId(): Promise<string> {
    await this.openInspectorRequestsView();
    const sessionId = await this.searchSessionId.getAttribute('data-search-session-id');
    await this.close();
    if (!sessionId) {
      throw new Error('No search session id exposed by the inspector');
    }
    return sessionId;
  }

  /**
   * The names of the requests listed by the open inspector's request chooser,
   * in the order they are offered. Leaves the chooser closed, since its open
   * list covers the request detail tabs.
   */
  async getRequestNames(): Promise<string[]> {
    const names = await this.page.components
      .comboBox('inspectorRequestChooser')
      .getAllVisibleOptions();
    await this.page.keyboard.press('Escape');
    return names;
  }

  /** The selected request's total time, in milliseconds, as the Requests view reports it. */
  async getRequestTotalTime(): Promise<number> {
    const badge = this.page.testSubj.locator('inspectorRequestTotalTime');
    await badge.waitFor({ state: 'visible' });
    return parseFloat((await badge.innerText()).replace('ms', ''));
  }

  async openRequestsStatisticsTab() {
    await this.requests.statisticsTab.click();
  }

  /**
   * Returns the table rows as a nested string array. Each inner array is one row's cell texts.
   */
  async getTableData(): Promise<string[][]> {
    await this.panel.locator('tbody').waitFor({ state: 'visible' });
    const tableRows = this.panel.locator('tbody tr');

    return tableRows.evaluateAll((rows) =>
      rows.map((row) =>
        Array.from(row.querySelectorAll('td')).map((cell) => {
          const euiTableCellContent = cell.querySelector('.euiTableCellContent');
          return (euiTableCellContent ?? cell).textContent?.trim() ?? '';
        })
      )
    );
  }

  /**
   * Clicks the Response tab, reads the Monaco editor content, and returns the
   * parsed JSON response object.
   */
  async getResponse(): Promise<Record<string, any>> {
    await this.page.testSubj.locator('inspectorRequestDetailResponse').click();
    await this.codeEditor.waitCodeEditorReady('inspectorRequestCodeViewerContainer');
    const responseString = await this.codeEditor.getCodeEditorValue();
    return JSON.parse(responseString);
  }
}
