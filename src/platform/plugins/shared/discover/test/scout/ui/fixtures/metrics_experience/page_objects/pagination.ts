/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@kbn/scout';

export interface PaginationLocators {
  readonly container: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  readonly getPageButton: (pageIndex: number) => Locator;
}

function createPaginationLocators(container: Locator): Omit<PaginationLocators, 'container'> {
  return {
    prevButton: container.locator('[data-test-subj="pagination-button-previous"]'),
    nextButton: container.locator('[data-test-subj="pagination-button-next"]'),
    getPageButton: (pageIndex: number) =>
      container.locator(`[data-test-subj="pagination-button-${pageIndex}"]`),
  };
}

export function createPagination(parentContainer: Locator): PaginationLocators {
  const container = parentContainer.locator('[data-test-subj="metricsExperienceGridPagination"]');
  return {
    container,
    ...createPaginationLocators(container),
  };
}

export function createDimensionsPagination(parentContainer: Locator): PaginationLocators {
  const container = parentContainer.locator(
    '[data-test-subj="metricsExperienceFlyoutOverviewTabDimensionsPagination"]'
  );
  return {
    container,
    ...createPaginationLocators(container),
  };
}
