/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { EuiSelectableWrapper } from '@kbn/scout';
import { METRICS_FLYOUT_DIMENSION_ITEM_DATA_TEST_SUBJ } from '../constants';

interface PaginationLocators {
  readonly container: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  getPageButton(pageIndex: number): Locator;
}

function createPaginationLocators(container: Locator): Omit<PaginationLocators, 'container'> {
  return {
    prevButton: container.locator('[data-test-subj="pagination-button-previous"]'),
    nextButton: container.locator('[data-test-subj="pagination-button-next"]'),
    getPageButton: (pageIndex: number) =>
      container.locator(`[data-test-subj="pagination-button-${pageIndex}"]`),
  };
}

function createPagination(parentContainer: Locator): PaginationLocators {
  const container = parentContainer.locator('[data-test-subj="metricsExperienceGridPagination"]');
  return {
    container,
    ...createPaginationLocators(container),
  };
}

interface FlyoutOverviewTab {
  readonly tab: Locator;
  readonly descriptionList: Locator;
  readonly dimensionsPagination: PaginationLocators;
  readonly dimensionsListItems: Locator;
}

interface FlyoutEsqlQueryTab {
  readonly tab: Locator;
  readonly codeBlock: Locator;
}

interface MetricsFlyout {
  readonly container: Locator;
  readonly overview: FlyoutOverviewTab;
  readonly esqlQuery: FlyoutEsqlQueryTab;
}

interface ChartActions {
  readonly viewDetails: Locator;
  readonly copyToDashboard: Locator;
  readonly explore: Locator;
}

interface BreakdownSelector {
  readonly button: Locator;
  readonly search: Locator;
  readonly selectable: Locator;
  getOption(dimensionName: string): Locator;
  getButtonWithSelectedDimension(dimensionName: string): Locator;
  selectDimension(dimensionName: string): Promise<void>;
}

function createBreakdownSelector(page: ScoutPage): BreakdownSelector {
  const selectableWrapper = new EuiSelectableWrapper(
    page,
    'metricsExperienceBreakdownSelectorSelectable'
  );
  const button = page.testSubj.locator('metricsExperienceBreakdownSelectorButton');
  const selectable = page.testSubj.locator('metricsExperienceBreakdownSelectorSelectable');

  return {
    button,
    search: page.testSubj.locator('metricsExperienceBreakdownSelectorSelectorSearch'),
    selectable,
    getOption: (dimensionName: string) =>
      page.testSubj.locator(`metricsBreakdownOption-${dimensionName}`),
    getButtonWithSelectedDimension: (dimensionName: string) =>
      page.locator(
        `[data-test-subj="metricsExperienceBreakdownSelectorButton"][data-selected-value*="${dimensionName}"]`
      ),
    selectDimension: async (dimensionName: string) => {
      if (!(await selectable.isVisible())) {
        await button.click();
        await selectable.waitFor({ state: 'visible' });
      }
      await selectableWrapper.searchAndSelectFirst(dimensionName);
    },
  };
}

function createChartActions(page: ScoutPage): ChartActions {
  return {
    viewDetails: page.testSubj.locator(
      'embeddablePanelAction-ACTION_METRICS_EXPERIENCE_VIEW_DETAILS'
    ),
    copyToDashboard: page.testSubj.locator(
      'embeddablePanelAction-ACTION_METRICS_EXPERIENCE_COPY_TO_DASHBOARD'
    ),
    explore: page.testSubj.locator(
      'embeddablePanelAction-ACTION_METRICS_EXPERIENCE_EXPLORE_IN_DISCOVER_TAB'
    ),
  };
}

function createDimensionsPagination(parentContainer: Locator): PaginationLocators {
  const container = parentContainer.locator(
    '[data-test-subj="metricsExperienceFlyoutOverviewTabDimensionsPagination"]'
  );
  return {
    container,
    ...createPaginationLocators(container),
  };
}

function createFlyout(page: ScoutPage): MetricsFlyout {
  const container = page.testSubj.locator('metricsExperienceFlyout');
  return {
    container,
    overview: {
      // TODO: Replace with page.testSubj.locator() once data-test-subj is added to tabs
      tab: page.locator('role=tab[name="Overview"]'),
      descriptionList: page.testSubj.locator('metricsExperienceFlyoutOverviewTabDescriptionList'),
      dimensionsPagination: createDimensionsPagination(container),
      dimensionsListItems: page.testSubj
        .locator('metricsExperienceFlyoutOverviewTabDimensionsList')
        .locator(`[data-test-subj^="${METRICS_FLYOUT_DIMENSION_ITEM_DATA_TEST_SUBJ}-"]`),
    },
    esqlQuery: {
      // TODO: Replace with page.testSubj.locator() once data-test-subj is added to tabs
      tab: page.locator('role=tab[name="ES|QL Query"]'),
      codeBlock: page.testSubj.locator('metricsExperienceFlyoutEsqlQueryCodeBlock'),
    },
  };
}

export class MetricsExperiencePage {
  // metricsExperienceRendered is the outer wrapper containing header, grid, and pagination
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

  constructor(page: ScoutPage) {
    this.container = page.testSubj.locator('metricsExperienceRendered');
    this.grid = page.testSubj.locator('unifiedMetricsExperienceGrid');
    this.cards = this.grid.locator('[data-chart-index]');
    this.pagination = createPagination(this.container);
    this.flyout = createFlyout(page);
    this.chartActions = createChartActions(page);
    this.breakdownSelector = createBreakdownSelector(page);
    this.searchButton = page.testSubj.locator('metricsExperienceToolbarSearch');
    this.searchInput = page.testSubj.locator('metricsExperienceGridToolbarSearch');
    this.emptyState = page.testSubj.locator('metricsExperienceNoData');
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

  public async getVisibleCardCount(): Promise<number> {
    return this.grid.locator('[data-chart-index]').count();
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
}
