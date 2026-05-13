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

export function createChartActions(page: ScoutPage): ChartActions {
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
    inspect: page.testSubj.locator('embeddablePanelAction-openInspector'),
    addToCase: page.testSubj.locator('embeddablePanelAction-embeddable_addToExistingCase'),
  };
}
