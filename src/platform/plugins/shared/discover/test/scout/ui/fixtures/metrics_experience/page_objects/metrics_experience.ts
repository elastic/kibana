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
import type { InspectorFlyout } from './examine_flyout';
import { createInspectorFlyout } from './examine_flyout';

export class MetricsExperiencePage {
  public readonly container: Locator;
  public readonly grid: Locator;
  public readonly fullscreenContainer: Locator;
  public readonly cards: Locator;
  public readonly pagination: PaginationLocators;
  public readonly flyout: MetricsFlyout;
  public readonly searchButton: Locator;
  public readonly searchInput: Locator;
  public readonly emptyState: Locator;
  public readonly chartActions: ChartActions;
  public readonly breakdownSelector: BreakdownSelector;
  public readonly inspectorFlyout: InspectorFlyout;
  public readonly fullscreenButton: Locator;

  constructor(page: ScoutPage) {
    // metricsExperienceRendered is the outer wrapper containing header, grid, and pagination
    this.container = page.testSubj.locator('metricsExperienceRendered');
    this.grid = page.testSubj.locator('unifiedMetricsExperienceGrid');
    this.fullscreenContainer = page.testSubj.locator('metricsGridWrapper');
    this.cards = this.grid.locator('[data-chart-index]');
    this.pagination = createGridPagination(this.container);
    this.flyout = createFlyout(page);
    this.chartActions = createChartActions(page);
    this.breakdownSelector = createBreakdownSelector(page);
    this.inspectorFlyout = createInspectorFlyout(page);
    this.searchButton = page.testSubj.locator('metricsExperienceToolbarSearch');
    this.searchInput = page.testSubj.locator('metricsExperienceGridToolbarSearch');
    this.emptyState = page.testSubj.locator('metricsExperienceNoData');
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
   * Opens the inspector flyout by triggering "Inspect" from the chart
   * actions menu of the given card.
   */
  public async openInspectorFlyout(cardIndex: number): Promise<void> {
    const card = this.getCardByIndex(cardIndex);
    await this.openCardContextMenu(cardIndex);
    await card.locator('[data-test-subj="embeddablePanelAction-openInspector"]').click();
    await this.inspectorFlyout.panel.waitFor({ state: 'visible' });
  }

  /**
   * Closes the inspector flyout.
   */
  public async closeInspectorFlyout(): Promise<void> {
    await this.inspectorFlyout.closeButton.click();
    await this.inspectorFlyout.panel.waitFor({ state: 'hidden' });
  }

  /**
   * Toggles fullscreen mode by clicking the fullscreen button in the toolbar.
   */
  public async toggleFullscreen(): Promise<void> {
    await this.fullscreenButton.click();
  }

  /**
   * Checks if the grid is currently in fullscreen mode by checking
   * if the fullscreen class is present on the container.
   */
  public async isFullscreen(): Promise<boolean> {
    const classAttr = await this.fullscreenContainer.getAttribute('class');
    return classAttr?.includes('metricsGridWrapper--fullScreen') ?? false;
  }
}
