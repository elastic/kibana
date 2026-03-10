/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export interface InspectorFlyout {
  readonly panel: Locator;
  readonly closeButton: Locator;
  readonly viewChooser: Locator;
  readonly requestsView: Locator;
  readonly dataView: Locator;
  readonly requestChooser: Locator;
  readonly statisticsTab: Locator;
  readonly requestTab: Locator;
  readonly responseTab: Locator;
  readonly requestTimestamp: Locator;
  readonly requestCodeViewer: Locator;
  readonly noRequestsMessage: Locator;
  getViewTab(viewTitle: string): Locator;
  getStatistic(statId: string): Locator;
}

export function createInspectorFlyout(page: ScoutPage): InspectorFlyout {
  const panel = page.testSubj.locator('inspectorPanel');

  return {
    panel,
    closeButton: page.testSubj.locator('euiFlyoutCloseButton'),
    viewChooser: page.testSubj.locator('inspectorViewChooser'),
    requestsView: page.testSubj.locator('inspectorViewChooserRequests'),
    dataView: page.testSubj.locator('inspectorViewChooserData'),
    requestChooser: page.testSubj.locator('inspectorRequestChooser'),
    statisticsTab: page.testSubj.locator('inspectorRequestDetailStatistics'),
    requestTab: page.testSubj.locator('inspectorRequestDetailRequest'),
    responseTab: page.testSubj.locator('inspectorRequestDetailResponse'),
    requestTimestamp: page.testSubj.locator('inspector.statistics.requestTimestamp'),
    requestCodeViewer: page.testSubj.locator('inspectorRequestCodeViewerContainer'),
    noRequestsMessage: page.testSubj.locator('inspectorNoRequestsMessage'),
    getViewTab: (viewTitle: string) => page.testSubj.locator(`inspectorViewChooser${viewTitle}`),
    getStatistic: (statId: string) => page.testSubj.locator(`inspector.statistics.${statId}`),
  };
}
