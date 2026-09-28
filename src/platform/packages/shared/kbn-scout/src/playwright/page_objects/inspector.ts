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
  public readonly panel: Locator;
  private readonly closeButton: Locator;
  private readonly viewChooser: Locator;
  private readonly appMenu: AppMenu;
  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.panel = this.page.testSubj.locator('inspectorPanel');
    this.closeButton = this.page.testSubj.locator('euiFlyoutCloseButton');
    this.viewChooser = this.page.testSubj.locator('inspectorViewChooser');
    this.appMenu = new AppMenu(this.page);
    this.codeEditor = new KibanaCodeEditorWrapper(this.page);
  }

  /**
   * Opens the inspector panel. Guards against re-opening if already visible.
   * Handles the overflow menu when the open button is collapsed.
   *
   * @param openButtonTestSubj - `data-test-subj` of the button that opens the inspector.
   *   Defaults to `'openInspectorButton'`.
   */
  async open(openButtonTestSubj: string = 'openInspectorButton'): Promise<void> {
    if (await this.panel.isVisible()) {
      return;
    }
    await this.appMenu.clickItem(openButtonTestSubj);
    await this.panel.waitFor({ state: 'visible' });
  }

  /**
   * Closes the inspector panel. No-ops if already closed.
   */
  async close(): Promise<void> {
    if (!(await this.panel.isVisible())) {
      return;
    }
    await this.closeButton.click();
    await this.panel.waitFor({ state: 'hidden' });
  }

  /**
   * Opens a specific inspector view by name (e.g. `'Requests'`, `'Data'`).
   * No-ops when the inspector renders only a single view (no view chooser).
   */
  async openInspectorView(viewId: string): Promise<void> {
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
  async openInspectorRequestsView(): Promise<void> {
    await this.openInspectorView('Requests');
  }

  getOpenRequestStatisticButton(): Locator {
    return this.page.testSubj.locator('inspectorRequestDetailStatistics');
  }

  /**
   * Returns the table rows as a nested string array. Each inner array is one row's cell texts.
   */
  async getTableData(): Promise<string[][]> {
    await this.panel.locator('tbody').waitFor({ state: 'visible' });
    return this.panel.locator('tbody tr').evaluateAll((rows) =>
      rows.map((row) =>
        Array.from(row.querySelectorAll('td')).map((cell) => {
          const euiContent = cell.querySelector('.euiTableCellContent');
          return (euiContent ?? cell).textContent?.trim() ?? '';
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
