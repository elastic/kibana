/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';
import type { ScoutPage } from '..';

export class Inspector {
  public readonly panel: Locator;
  public readonly closeButton: Locator;
  public readonly viewChooser: Locator;
  public readonly requestsView: Locator;
  public readonly statisticsTab: Locator;
  public readonly requestTab: Locator;
  public readonly responseTab: Locator;
  public readonly requestTimestamp: Locator;
  public readonly requestCodeViewer: Locator;

  constructor(private readonly page: ScoutPage) {
    this.panel = page.testSubj.locator('inspectorPanel');
    this.closeButton = page.testSubj.locator('euiFlyoutCloseButton');
    this.viewChooser = page.testSubj.locator('inspectorViewChooser');
    this.requestsView = page.testSubj.locator('inspectorViewChooserRequests');
    this.statisticsTab = page.testSubj.locator('inspectorRequestDetailStatistics');
    this.requestTab = page.testSubj.locator('inspectorRequestDetailRequest');
    this.responseTab = page.testSubj.locator('inspectorRequestDetailResponse');
    this.requestTimestamp = page.testSubj.locator('inspector.statistics.requestTimestamp');
    this.requestCodeViewer = page.testSubj.locator('inspectorRequestCodeViewerContainer');
  }

  async open() {
    await this.page.testSubj.click('openInspectorButton');
    await this.panel.waitFor({ state: 'visible' });
  }

  async close() {
    await this.closeButton.click();
    await this.panel.waitFor({ state: 'hidden' });
  }

  async switchToRequestsView() {
    await this.viewChooser.click();
    await this.requestsView.click();
  }
}
