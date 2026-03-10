/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';
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
  public readonly cards: Locator;
  public readonly pagination: PaginationLocators;
  public readonly flyout: MetricsFlyout;
  public readonly searchButton: Locator;
  public readonly searchInput: Locator;
  public readonly emptyState: Locator;
  public readonly chartActions: ChartActions;
  public readonly breakdownSelector: BreakdownSelector;
  public readonly share: ShareHelper;
  private readonly page: ScoutPage;

  constructor(page: ScoutPage) {
    this.page = page;
    // metricsExperienceRendered is the outer wrapper containing header, grid, and pagination
    this.container = page.testSubj.locator('metricsExperienceRendered');
    this.grid = page.testSubj.locator('unifiedMetricsExperienceGrid');
    this.cards = this.grid.locator('[data-chart-index]');
    this.pagination = createGridPagination(this.container);
    this.flyout = createFlyout(page);
    this.chartActions = createChartActions(page);
    this.breakdownSelector = createBreakdownSelector(page);
    this.searchButton = page.testSubj.locator('metricsExperienceToolbarSearch');
    this.searchInput = page.testSubj.locator('metricsExperienceGridToolbarSearch');
    this.emptyState = page.testSubj.locator('metricsExperienceNoData');
    this.share = createShareHelper(page);
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
   * Returns a legend item locator scoped to a specific card by matching
   * the visible text of the elastic-charts legend label.
   */
  public getLegendItemInCard(index: number, legendLabel: string): Locator {
    return this.getCardByIndex(index)
      .locator('.echLegendItem__label')
      .filter({ hasText: legendLabel });
  }
}
