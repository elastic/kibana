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
 * `testSubj` may be set either on the `EuiDataGrid` itself or on an ancestor
 * wrapper that contains exactly one grid — consumers commonly only have a subj
 * on a surrounding container (e.g. `alertsTableIsLoaded`), while EUI toggles
 * state classes (fullscreen) on the `.euiDataGrid` element itself, so the
 * object resolves the actual grid element internally.
 */
export class EuiDataGridObject extends BaseObject {
  constructor(scope: ObjectScope, testSubj: string) {
    // No componentSelector: the subj element is often an ancestor of the grid,
    // not the grid itself, so the BaseObject root guard cannot be used here.
    // Root-resolution support in BaseObject is tracked for the EUI port.
    super(scope, testSubj);
  }

  /**
   * The `.euiDataGrid` element — the subj element itself when the consumer set
   * the subj on `EuiDataGrid`, otherwise its single `.euiDataGrid` descendant.
   */
  private get grid(): Locator {
    return this.root.locator(':scope.euiDataGrid, :scope .euiDataGrid');
  }

  /**
   * A single data cell, addressed by row index and column id. Column order and
   * virtualized horizontal scrolling do not affect the column id.
   */
  cell(rowIndex: number, columnId: string): Locator {
    return this.grid.locator(
      `.euiDataGridRowCell[data-gridcell-column-id="${columnId}"][data-gridcell-row-index="${rowIndex}"]`
    );
  }

  /**
   * All currently rendered data cells of a column. Rows are virtualized, so
   * this is the rendered window, not necessarily every row.
   */
  cells(columnId: string): Locator {
    return this.grid.locator(`.euiDataGridRowCell[data-gridcell-column-id="${columnId}"]`);
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
    return this.grid.locator('.euiDataGridRow');
  }

  /**
   * Opens the header actions of a column and clicks the given action.
   * `columnId` is the grid column id (matched verbatim), `actionLabel` is the
   * visible action label (e.g. 'Hide column', 'Sort A-Z').
   */
  async doActionOnColumn(columnId: string, actionLabel: string): Promise<void> {
    const headerCell = this.grid.locator(
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
    return this.grid.and(this.root.page().locator('.euiDataGrid--fullScreen'));
  }

  /**
   * The fullscreen button sits in a tooltip wrapper and keeps focus after the
   * click, which keeps the tooltip open over the grid — blur it right away.
   */
  private async clickFullScreenButton(): Promise<void> {
    const button = this.grid.getByTestId('dataGridFullScreenButton');
    await button.click();
    await button.blur();
  }
}
