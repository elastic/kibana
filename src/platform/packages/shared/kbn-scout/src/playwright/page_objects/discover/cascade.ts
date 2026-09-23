/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '../../../..';
import { LayoutMixin } from './layout';

/**
 * Cascade ("grouped results") layout helpers — the newest and most churn-prone
 * Discover subsystem. Isolated here so edits affect only the cascade scope.
 */
export abstract class CascadeMixin extends LayoutMixin {
  getCascadeLayout(): Locator {
    return this.page.testSubj.locator('data-cascade');
  }

  /**
   * Trigger for the "Group by" popover in the cascade layout toolbar. Despite
   * the `...Switch` test subject it is a popover button, not a toggle — use
   * {@link optOutOfCascadeLayout} to actually leave the cascade layout.
   */
  getCascadeLayoutSwitch(): Locator {
    return this.page.testSubj.locator('discoverEnableCascadeLayoutSwitch');
  }

  /**
   * Leaves the cascade ("grouped results") layout that Discover switches to for
   * `STATS ... BY` ES|QL queries, restoring the flat doc table. Expects the
   * cascade layout to be showing — it fails rather than silently doing nothing
   * if the layout is absent, so callers notice when the trigger stops applying.
   */
  async optOutOfCascadeLayout() {
    await this.getCascadeLayoutSwitch().click();
    await this.page.testSubj.locator('discoverGroupBySelectionList').waitFor({ state: 'visible' });
    await this.page.testSubj.click('discoverCascadeLayoutOptOutButton');
    await this.waitUntilTabIsLoaded();
    await this.getCascadeLayout().waitFor({ state: 'hidden' });
  }

  async isShowingCascadeLayout(): Promise<boolean> {
    const cascadeLayout = this.getCascadeLayout();
    const flatLayout = this.page.testSubj.locator('discoverDocTable');

    await cascadeLayout.or(flatLayout).waitFor({ state: 'visible' });
    return cascadeLayout.isVisible();
  }

  private getCascadeScrollContainer(): Locator {
    return this.page.testSubj.locator('dataCascadeScrollContainer');
  }

  /**
   * Returns the ids of the top-level ("root") cascade rows currently
   * scrolled into view within the cascade scroll container.
   */
  async getCascadeLayoutVisibleRowIds(): Promise<string[]> {
    return this.getCascadeScrollContainer().evaluate((container) => {
      const containerRect = container.getBoundingClientRect();
      const rows = container.querySelectorAll('[data-row-type="root"]');
      const visibleIds: string[] = [];
      for (const row of rows) {
        const rowRect = row.getBoundingClientRect();
        if (rowRect.top >= containerRect.bottom) break;
        if (rowRect.bottom > containerRect.top) {
          visibleIds.push(row.id || '');
        }
      }
      return visibleIds;
    });
  }

  /**
   * Whether the given cascade row id is currently expanded.
   */
  async isCascadeLayoutRowExpanded(rowId: string): Promise<boolean> {
    return (await this.page.locator(`[id="${rowId}"]`).getAttribute('aria-expanded')) === 'true';
  }

  /**
   * Clicks the expand/collapse toggle for the cascade row with the given id,
   * without waiting for the resulting state change. Scoped to the row: while
   * scrolled, the sticky pinned group header renders a `createPortal`
   * duplicate of this same button elsewhere in the DOM (outside the row), so
   * an unscoped page-wide testSubj locator can match two elements.
   */
  async clickCascadeRowToggle(rowId: string): Promise<void> {
    await this.page
      .locator(`[id="${rowId}"]`)
      .locator(`[data-test-subj="toggle-row-${rowId}-button"]`)
      .click();
  }

  /**
   * Waits until the cascade row with the given id reports the given expansion
   * state, without waiting for the data of an expanded row to load.
   */
  async waitForCascadeLayoutRowExpanded(rowId: string, expanded: boolean): Promise<void> {
    await this.page
      .locator(`[id="${rowId}"]`)
      .and(this.page.locator(`[aria-expanded="${expanded}"]`))
      .waitFor({ state: 'attached' });
  }

  /**
   * Toggles (expands/collapses) the cascade row with the given id and waits
   * for the `aria-expanded` state to flip before returning. Waits for the doc
   * table to finish rendering after an expand, since that triggers a fetch.
   */
  async toggleCascadeLayoutRow(rowId: string): Promise<void> {
    const row = this.page.locator(`[id="${rowId}"]`);
    const wasExpanded = (await row.getAttribute('aria-expanded')) === 'true';

    await this.clickCascadeRowToggle(rowId);
    await this.waitForCascadeLayoutRowExpanded(rowId, !wasExpanded);

    if (!wasExpanded) {
      await this.dataGrid.waitForDocTableRendered();
    }
  }

  /**
   * Waits for the cascade layout's virtualizer to finish
   * measuring/correcting itself (e.g. restoring a scroll anchor after a tab
   * switch). The scroll container is hidden behind a loading spinner via
   * `visibility: hidden` until the virtualizer reports itself stable.
   */
  async waitForCascadeLayoutStable(): Promise<void> {
    await this.getCascadeScrollContainer().waitFor({ state: 'visible' });
  }

  /**
   * Current `scrollTop` of the cascade layout's scroll container.
   */
  async getCascadeLayoutScrollTop(): Promise<number> {
    return this.getCascadeScrollContainer().evaluate((container) => container.scrollTop);
  }

  /**
   * Scrolls the cascade layout's scroll container by `delta` pixels.
   */
  async scrollCascadeLayoutBy(delta: number): Promise<void> {
    await this.getCascadeScrollContainer().evaluate((container, scrollDelta) => {
      container.scrollTop += scrollDelta;
    }, delta);
  }

  /**
   * Waits for a just-performed scroll/expand of the cascade layout to be
   * persisted for state restoration. Persistence is debounced/throttled
   * internally with no externally observable signal, so callers must pause
   * here before triggering a remount (e.g. switching tabs) or the
   * just-performed change can be dropped and restored from stale state.
   */
  async waitForCascadeStatePersisted(): Promise<void> {
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(500);
  }
}
