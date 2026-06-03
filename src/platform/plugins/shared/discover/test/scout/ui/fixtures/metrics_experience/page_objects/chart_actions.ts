/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export interface ChartActions {
  readonly viewDetails: Locator;
  readonly copyToDashboard: Locator;
  readonly explore: Locator;
  readonly inspect: Locator;
  readonly addToCase: Locator;
}

/**
 * Builds action locators for a single metric card.
 *
 * Hover-row actions (viewDetails, copyToDashboard, explore, inspect) are scoped
 * to `card` so Playwright strict mode is satisfied when multiple cards are
 * rendered simultaneously.
 *
 * `addToCase` is rendered by EUI into a portal at document.body (outside the
 * card DOM subtree), so it remains page-scoped — only one context-menu popover
 * can be open at a time, so there is never more than one matching element.
 */
export function createChartActions(card: Locator, page: ScoutPage): ChartActions {
  return {
    viewDetails: card.locator(
      '[data-test-subj="embeddablePanelAction-ACTION_METRICS_EXPERIENCE_VIEW_DETAILS"]'
    ),
    copyToDashboard: card.locator(
      '[data-test-subj="embeddablePanelAction-ACTION_METRICS_EXPERIENCE_COPY_TO_DASHBOARD"]'
    ),
    explore: card.locator(
      '[data-test-subj="embeddablePanelAction-ACTION_METRICS_EXPERIENCE_EXPLORE_IN_DISCOVER_TAB"]'
    ),
    inspect: card.locator('[data-test-subj="embeddablePanelAction-openInspector"]'),
    addToCase: page.testSubj.locator('embeddablePanelAction-embeddable_addToExistingCase'),
  };
}
