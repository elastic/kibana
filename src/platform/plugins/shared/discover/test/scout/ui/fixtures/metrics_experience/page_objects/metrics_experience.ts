/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

interface MetricsPagination {
  readonly container: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  getPageButton(pageIndex: number): Locator;
}

function createPagination(parentContainer: Locator): MetricsPagination {
  const container = parentContainer.locator('[data-test-subj="metricsExperienceGridPagination"]');
  return {
    container,
    prevButton: container.locator('[data-test-subj="pagination-button-previous"]'),
    nextButton: container.locator('[data-test-subj="pagination-button-next"]'),
    getPageButton: (pageIndex: number) =>
      container.locator(`[data-test-subj="pagination-button-${pageIndex}"]`),
  };
}

export class MetricsExperiencePage {
  // metricsExperienceRendered is the outer wrapper containing header, grid, and pagination
  public readonly container: Locator;
  public readonly grid: Locator;
  public readonly cards: Locator;
  public readonly pagination: MetricsPagination;
  public readonly searchButton: Locator;
  public readonly searchInput: Locator;
  public readonly emptyState: Locator;

  constructor(page: ScoutPage) {
    this.container = page.testSubj.locator('metricsExperienceRendered');
    this.grid = page.testSubj.locator('unifiedMetricsExperienceGrid');
    this.cards = this.grid.locator('[data-chart-index]');
    this.pagination = createPagination(this.container);
    this.searchButton = page.testSubj.locator('metricsExperienceToolbarSearch');
    this.searchInput = page.testSubj.locator('metricsExperienceGridToolbarSearch');
    this.emptyState = page.testSubj.locator('metricsExperienceNoData');
  }

  public getCardByIndex(index: number): Locator {
    return this.grid.locator(`[data-chart-index="${index}"]`);
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
}
