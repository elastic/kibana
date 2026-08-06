/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BaseObject, type ObjectScope } from '@elastic/eui-test-helpers';
import type { Locator } from '@playwright/test';

/**
 * Playwright Component Object for
 * {@link https://eui.elastic.co/docs/components/tables/data-grid/ EuiDataGrid}.
 *
 * Prototype for `@elastic/eui-test-helpers` (see the package CONTRIBUTING guide);
 * lives in kbn-scout until it is ported and published.
 *
 * `testSubj` must be set on the `EuiDataGrid` itself (the guard enforces it) —
 * EUI toggles state classes (fullscreen) on that element. When the subj is not
 * unique on the page (e.g. portal-rendered duplicates), narrow with the `scope`
 * parameter instead of pointing the subj at a wrapper.
 */
export class EuiDataGridObject extends BaseObject {
  constructor(scope: ObjectScope, testSubj: string) {
    super(scope, testSubj, '.euiDataGrid');
  }

  /**
   * A single data cell, addressed by row index and column id. Column order and
   * virtualized horizontal scrolling do not affect the column id.
   */
  cell(rowIndex: number, columnId: string): Locator {
    return this.root.locator(
      `.euiDataGridRowCell[data-gridcell-column-id="${columnId}"][data-gridcell-row-index="${rowIndex}"]`
    );
  }

  /**
   * All currently rendered data cells of a column. Rows are virtualized, so
   * this is the rendered window, not necessarily every row.
   */
  cells(columnId: string): Locator {
    return this.root.locator(`.euiDataGridRowCell[data-gridcell-column-id="${columnId}"]`);
  }

  /**
   * The rows currently mounted in the DOM, as a `Locator` so callers keep
   * Playwright auto-retry for count and content assertions
   * (e.g. `expect(rows).toHaveCount(pageSize)`, `expect(rows).not.toHaveCount(0)`).
   * For a paginated grid this is the current page's rows. Rows are virtualized,
   * so on a grid too tall for its container this is only the visible window —
   * never treat it as the full data set.
   */
  public get rows(): Locator {
    return this.root.locator('.euiDataGridRow');
  }

  /**
   * Opens the header actions of a column and clicks the given action.
   * `columnId` is the grid column id (matched verbatim), `actionLabel` is the
   * visible action label (e.g. 'Hide column', 'Sort A-Z').
   */
  async doActionOnColumn(columnId: string, actionLabel: string): Promise<void> {
    const headerCell = this.root.locator(
      `.euiDataGridHeaderCell[data-gridcell-column-id="${columnId}"]`
    );
    // The actions button only becomes interactable when the header cell is
    // focused/hovered and inside the viewport.
    await headerCell.scrollIntoViewIfNeeded();
    await headerCell.focus();
    await headerCell.hover();
    await headerCell.locator('.euiDataGridHeaderCell__button').click();

    // The action menu renders in a portal; EUI names it per column id, which
    // keeps this safe when several grids coexist.
    const actionsMenu = this.root.page().getByTestId(`dataGridHeaderCellActionGroup-${columnId}`);
    await actionsMenu.waitFor({ state: 'visible' });
    await actionsMenu.locator(`.euiListGroupItem__label[title="${actionLabel}"]`).click();
    await actionsMenu.waitFor({ state: 'hidden' });
  }

  /** Enters fullscreen mode via the toolbar button. */
  async openFullScreenMode(): Promise<void> {
    await this.clickFullScreenButton();
    await this.fullScreenGrid.waitFor({ state: 'visible' });
  }

  /** Exits fullscreen mode via the toolbar button. */
  async closeFullScreenMode(): Promise<void> {
    await this.clickFullScreenButton();
    await this.fullScreenGrid.waitFor({ state: 'detached' });
  }

  /** The grid element only while it carries the fullscreen state class. */
  private get fullScreenGrid(): Locator {
    return this.root.and(this.root.page().locator('.euiDataGrid--fullScreen'));
  }

  /**
   * The fullscreen button sits in a tooltip wrapper and keeps focus after the
   * click, which keeps the tooltip open over the grid — blur it right away.
   */
  private async clickFullScreenButton(): Promise<void> {
    const button = this.root.getByTestId('dataGridFullScreenButton');
    await button.click();
    await button.blur();
  }
}
