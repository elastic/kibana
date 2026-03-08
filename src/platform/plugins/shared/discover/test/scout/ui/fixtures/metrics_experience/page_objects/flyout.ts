/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { METRICS_FLYOUT_DIMENSION_ITEM_DATA_TEST_SUBJ } from '../constants';
import type { PaginationLocators } from './pagination';
import { createDimensionsPagination } from './pagination';

export interface FlyoutOverviewTab {
  readonly tabButton: Locator;
  readonly descriptionList: Locator;
  readonly dimensionsPagination: PaginationLocators;
  readonly dimensionsListItems: Locator;
}

export interface FlyoutEsqlQueryTab {
  readonly tabButton: Locator;
  readonly codeBlock: Locator;
}

export interface MetricsFlyout {
  readonly container: Locator;
  readonly overview: FlyoutOverviewTab;
  readonly esqlQuery: FlyoutEsqlQueryTab;
}

export function createFlyout(page: ScoutPage): MetricsFlyout {
  const container = page.testSubj.locator('metricsExperienceFlyout');
  return {
    container,
    overview: {
      tabButton: page.testSubj.locator('metricsExperienceFlyoutOverviewTab'),
      descriptionList: page.testSubj.locator('metricsExperienceFlyoutOverviewTabDescriptionList'),
      dimensionsPagination: createDimensionsPagination(container),
      dimensionsListItems: page.testSubj
        .locator('metricsExperienceFlyoutOverviewTabDimensionsList')
        .locator(`[data-test-subj^="${METRICS_FLYOUT_DIMENSION_ITEM_DATA_TEST_SUBJ}-"]`),
    },
    esqlQuery: {
      tabButton: page.testSubj.locator('metricsExperienceFlyoutEsqlQueryTab'),
      codeBlock: page.testSubj.locator('metricsExperienceFlyoutEsqlQueryCodeBlock'),
    },
  };
}
