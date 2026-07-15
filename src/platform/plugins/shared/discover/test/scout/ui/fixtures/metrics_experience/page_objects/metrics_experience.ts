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
import type { ChartInteractions } from './chart_interactions';
import { createChartInteractions } from './chart_interactions';
import type { BreakdownSelector } from './breakdown_selector';
import { createBreakdownSelector } from './breakdown_selector';
import type { ShareHelper } from './share_helper';
import { createShareHelper } from './share_helper';
import type { GridSettings } from './grid_settings';
import { createGridSettings } from './grid_settings';

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
  public readonly sortSelectorButton: Locator;
  public readonly sortDirectionAsc: Locator;
  public readonly sortDirectionDesc: Locator;
  public readonly chartInteractions: ChartInteractions;
  public readonly breakdownSelector: BreakdownSelector;
  public readonly share: ShareHelper;
  public readonly gridSettings: GridSettings;
  public readonly fullscreenButton: Locator;
  public readonly chromeHeader: Locator;

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
    this.chartInteractions = createChartInteractions(page, (index) => this.getCardByIndex(index));
    this.breakdownSelector = createBreakdownSelector(page);
    this.searchButton = page.testSubj.locator('metricsExperienceToolbarSearch');
    this.searchInput = page.testSubj.locator('metricsExperienceGridToolbarSearch');
    this.emptyState = page.testSubj.locator('metricsExperienceNoData');
    this.sortSelectorButton = page.testSubj.locator('metricsExperienceSortSelectorButton');
    this.sortDirectionAsc = page.testSubj.locator('metricsExperienceSortDirectionAsc');
    this.sortDirectionDesc = page.testSubj.locator('metricsExperienceSortDirectionDesc');
    this.share = createShareHelper(page);
    this.gridSettings = createGridSettings(page);
    this.fullscreenButton = page.testSubj.locator('metricsExperienceToolbarFullScreen');
    this.chromeHeader = page.testSubj.locator('kbnChromeLayoutHeader');
  }

  public getCardByIndex(index: number): Locator {
    return this.grid.locator(`[data-chart-index="${index}"]`);
  }

  /**
   * Returns action locators scoped to the card at `index`.
   *
   * Hover-row actions are scoped to the card element so Playwright strict mode
   * is satisfied when multiple cards share the same action test-subjs.
   * `addToCase` remains page-scoped because EUI renders it into a portal.
   */
  public chartActionsFor(index: number): ChartActions {
    return createChartActions(this.getCardByIndex(index), this.page);
  }

  /**
   * Waits until the first chart card matches the expected id (since pagination/query updates replace cards
   * asynchronously). Call before `expect(cards).toHaveCount(...)` so the count is not asserted
   * against a stale page.
   */
  public async waitForFirstCard(expectedFirstCardId: string): Promise<void> {
    await this.grid
      .locator(`[data-chart-index="0"][id="${expectedFirstCardId}"]`)
      .waitFor({ state: 'visible' });
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

  public async setSortDirection(direction: 'asc' | 'desc'): Promise<void> {
    await (direction === 'asc' ? this.sortDirectionAsc : this.sortDirectionDesc).click();
  }

  public async toggleFullscreen(): Promise<void> {
    // Entering fullscreen triggers `handleEuiFullScreenChanges` which calls
    // `chrome.setIsVisible(false)` asynchronously. Wait for the chrome header
    // to actually hide/show before resolving, otherwise subsequent clicks on
    // the toolbar can be intercepted by the still-sticky chrome header.
    const isFullscreen = await this.fullscreen.isVisible();
    await this.fullscreenButton.click();
    await this.chromeHeader.waitFor({ state: isFullscreen ? 'visible' : 'hidden' });
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
   * Hovers a card to reveal the visible quick-action row, then clicks the
   * given action locator.
   */
  private async clickVisibleQuickAction(cardIndex: number, action: Locator): Promise<void> {
    const card = this.getCardByIndex(cardIndex);
    await card.hover();
    await action.waitFor({ state: 'visible' });
    await action.click();
  }

  /**
   * Opens the insights flyout by clicking "View details" on the visible
   * quick-action row of the given card.
   */
  public async openInsightsFlyout(cardIndex: number): Promise<void> {
    await this.clickVisibleQuickAction(cardIndex, this.chartActionsFor(cardIndex).viewDetails);
  }

  /**
   * Opens the inspector flyout by clicking "Inspect" on the visible
   * quick-action row of the given card.
   *
   * Do NOT switch this to `openCardContextMenu` — `openInspector` is promoted to
   * the visible row via `METRICS_QUICK_ACTION_IDS` and will not appear in the
   * context-menu popover when it is already in the hover row.
   */
  public async openInspectorFlyout(cardIndex: number): Promise<void> {
    await this.clickVisibleQuickAction(cardIndex, this.chartActionsFor(cardIndex).inspect);
  }
}
