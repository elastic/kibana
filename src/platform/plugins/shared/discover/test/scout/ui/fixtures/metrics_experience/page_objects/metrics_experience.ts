/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { PaginationLocators } from './pagination';
import { createGridPagination } from './pagination';
import type { MetricsFlyout } from './flyout';
import { createFlyout } from './flyout';
import type { ChartActions } from './chart_actions';
import { createChartActions } from './chart_actions';
import type { BreakdownSelector } from './breakdown_selector';
import { createBreakdownSelector } from './breakdown_selector';
import type { ShareHelper } from './share_helper';
import { createShareHelper } from './share_helper';

export class MetricsExperiencePage {
  public readonly container: Locator;
  public readonly grid: Locator;
  public readonly fullscreen: Locator;
  public readonly cards: Locator;
  public readonly pagination: PaginationLocators;
  public readonly flyout: MetricsFlyout;
  public readonly searchButton: Locator;
  public readonly searchInput: Locator;
  public readonly emptyState: Locator;
  public readonly chartActions: ChartActions;
  public readonly breakdownSelector: BreakdownSelector;
  public readonly share: ShareHelper;
  public readonly fullscreenButton: Locator;
  private readonly page: ScoutPage;

  constructor(page: ScoutPage) {
    this.page = page;
    // metricsExperienceRendered is the outer wrapper containing header, grid, and pagination
    this.container = page.testSubj.locator('metricsExperienceRendered');
    this.grid = page.testSubj.locator('unifiedMetricsExperienceGrid');
    this.fullscreen = page.testSubj.locator('metricsGridWrapper-fullScreen');
    this.cards = this.grid.locator('[data-chart-index]');
    this.pagination = createGridPagination(this.container);
    this.flyout = createFlyout(page);
    this.chartActions = createChartActions(page);
    this.breakdownSelector = createBreakdownSelector(page);
    this.searchButton = page.testSubj.locator('metricsExperienceToolbarSearch');
    this.searchInput = page.testSubj.locator('metricsExperienceGridToolbarSearch');
    this.emptyState = page.testSubj.locator('metricsExperienceNoData');
    this.share = createShareHelper(page);
    this.fullscreenButton = page.testSubj.locator('metricsExperienceToolbarFullScreen');
  }

  public getCardByIndex(index: number): Locator {
    return this.grid.locator(`[data-chart-index="${index}"]`);
  }

  /**
   * Returns quick actions scoped to a specific card by index.
   * Quick actions (like Explore) are rendered in the hover bar inside the card.
   * Use this instead of global locators to avoid strict mode violations
   * when multiple cards have visible hover actions.
   */
  public getQuickActionsForCard(index: number): { explore: Locator } {
    const card = this.getCardByIndex(index);
    return {
      explore: card.locator(
        '[data-test-subj="embeddablePanelAction-ACTION_METRICS_EXPERIENCE_EXPLORE_IN_DISCOVER_TAB"]'
      ),
    };
  }

  public async searchMetric(term: string): Promise<void> {
    const isInputVisible = await this.searchInput.isVisible();
    if (!isInputVisible) {
      await this.searchButton.click();
    }
    await this.searchInput.fill(term);
  }

  public async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }

  public getVisibleCardCount(): Promise<number> {
    return this.cards.count();
  }

  public async toggleFullscreen(): Promise<void> {
    await this.fullscreenButton.click();
  }

  /**
   * Hovers over a metric card to reveal the panel header, then clicks the
   * context menu toggle button to open the chart actions menu.
   */
  public async openCardContextMenu(index: number): Promise<void> {
    const card = this.getCardByIndex(index);
    const menuButton = card.locator('[data-test-subj="embeddablePanelToggleMenuIcon"]');
    await card.hover();
    await menuButton.waitFor({ state: 'visible' });
    await menuButton.click();
  }

  /**
   * Opens the insights flyout by triggering "View details" from the chart
   * actions menu of the given card.
   */
  public async openInsightsFlyout(cardIndex: number): Promise<void> {
    await this.openCardContextMenu(cardIndex);
    await this.chartActions.viewDetails.click();
  }

  /**
   * Waits for the embeddable panel inside a card to signal that rendering is
   * complete via the `data-render-complete="true"` attribute set by Lens.
   *
   * Uses polling to verify the attribute stays `"true"` for a minimum
   * duration, guarding against transient flips that can occur when Lens
   * re-renders (e.g. after a brush or filter action). This mirrors the
   * approach used by `DiscoverApp.waitForDocTableRendered`.
   */
  public async waitForCardRenderComplete(index: number): Promise<void> {
    const panel = this.getCardByIndex(index).locator('[data-test-subj="embeddablePanel"]');
    await expect(panel).toBeVisible();

    const minDurationMs = 2_000;
    const pollIntervalMs = 100;
    const totalTimeoutMs = 30_000;

    let stableSince: number | null = null;

    await expect
      .poll(
        async () => {
          const attr = await panel.getAttribute('data-render-complete');
          const now = Date.now();

          if (attr === 'true') {
            if (!stableSince) {
              stableSince = now;
            }
            return now - stableSince >= minDurationMs;
          }
          // Reset if it flips away from 'true'
          stableSince = null;
          return false;
        },
        {
          message: `data-render-complete on card ${index} did not stay 'true' for ${minDurationMs}ms`,
          timeout: totalTimeoutMs,
          intervals: [pollIntervalMs],
        }
      )
      .toBe(true);
  }

  /**
   * Filters by the first visible legend series in a metric card chart.
   *
   * When a breakdown dimension is active, each series gets a legend entry.
   * Elastic-charts renders legend action buttons with stable `data-test-subj`
   * attributes: `legend-{seriesLabel}` opens the action popover and
   * `legend-{seriesLabel}-filterIn` applies the "Filter for" action.
   * This triggers the same `onFilter` callback path as clicking a data point
   * directly, but is far more reliable because the legend is DOM-rendered
   * rather than canvas-rendered (no hit-detection radius concerns).
   *
   * NOTE: This requires `onFilter` to be wired up for ES|QL mode in
   * `use_discover_histogram.ts`. Without that product fix the filter action
   * is a no-op and the WHERE clause will not be appended to the query.
   */
  public async filterByFirstLegendSeries(cardIndex: number): Promise<void> {
    const card = this.getCardByIndex(cardIndex);
    // Read the data-test-subj of the first legend trigger in the card's DOM so
    // we can build a fully specific selector, avoiding positional Playwright APIs.
    // Legend triggers have data-test-subj="legend-{seriesValue}"; child action
    // buttons share the same prefix so they are excluded from the query.
    const triggerTestSubj = await card
      .locator('[data-test-subj^="legend-"]:not([data-test-subj*="-filter"])')
      .evaluateAll((els) => els[0]?.getAttribute('data-test-subj') ?? null);

    if (!triggerTestSubj) {
      throw new Error(`No legend items found in card ${cardIndex}`);
    }

    await card.locator(`[data-test-subj="${triggerTestSubj}"]`).click();
    // The filter-in button renders in a portal; scope to the page not the card.
    await this.page.locator(`[data-test-subj="${triggerTestSubj}-filterIn"]`).click();
  }

  /**
   * Returns the chart canvas locator within a metric card's Lens embeddable.
   */
  public getChartCanvasForCard(index: number): Locator {
    return this.getCardByIndex(index).locator('canvas');
  }

  /**
   * Performs a brush (click-and-drag) gesture on the chart canvas within a
   * metric card. Drags from ~25% to ~75% of the canvas width horizontally.
   */
  public async brushChartInCard(index: number): Promise<void> {
    const canvas = this.getChartCanvasForCard(index);
    await canvas.waitFor({ state: 'visible' });
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error(`Could not get bounding box for chart canvas in card ${index}`);
    }
    const y = box.y + box.height / 2;
    const startX = box.x + box.width * 0.25;
    const endX = box.x + box.width * 0.75;

    await this.page.mouse.move(startX, y);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, y, { steps: 10 });
    await this.page.mouse.up();
  }

  /**
   * Opens the inspector flyout by triggering "Inspect" from the chart
   * actions menu of the given card.
   */
  public async openInspectorFlyout(cardIndex: number): Promise<void> {
    await this.openCardContextMenu(cardIndex);
    await this.getCardByIndex(cardIndex)
      .locator('[data-test-subj="embeddablePanelAction-openInspector"]')
      .click();
  }
}
