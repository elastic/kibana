/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';

export type InspectorView = 'Requests' | 'Data';

const VIEW_CHOOSER_TEST_SUBJECTS: Record<InspectorView, string> = {
  Requests: 'inspectorViewChooserRequests',
  Data: 'inspectorViewChooserData',
};

export class Inspector {
  public readonly panel: Locator;
  public readonly closeButton: Locator;
  public readonly viewChooser: Locator;

  public readonly requests: {
    readonly requestChooser: Locator;
    readonly documentsRequest: Locator;
    readonly statisticsTab: Locator;
    readonly requestTab: Locator;
    readonly responseTab: Locator;
    readonly timestamp: Locator;
    readonly codeViewer: Locator;
  };

  constructor(private readonly page: ScoutPage) {
    this.panel = page.testSubj.locator('inspectorPanel');
    this.closeButton = page.testSubj.locator('euiFlyoutCloseButton');
    this.viewChooser = page.testSubj.locator('inspectorViewChooser');

    this.requests = {
      requestChooser: page.testSubj.locator('inspectorRequestChooser'),
      documentsRequest: page.testSubj.locator('inspectorRequestChooserDocuments'),
      statisticsTab: page.testSubj.locator('inspectorRequestDetailStatistics'),
      requestTab: page.testSubj.locator('inspectorRequestDetailRequest'),
      responseTab: page.testSubj.locator('inspectorRequestDetailResponse'),
      timestamp: page.testSubj.locator('inspector.statistics.requestTimestamp'),
      codeViewer: page.testSubj.locator('inspectorRequestCodeViewerContainer'),
    };
  }

  async open() {
    await this.page.testSubj.click('openInspectorButton');
    await this.panel.waitFor({ state: 'visible' });
  }

  async close() {
    await this.closeButton.click();
    await this.panel.waitFor({ state: 'hidden' });
  }

  async getRequestTimestamp(): Promise<string> {
    await this.panel.waitFor({ state: 'visible' });
    return this.requests.timestamp.innerText();
  }

  async openInspectorView(view: InspectorView) {
    await this.panel.waitFor({ state: 'visible' });
    const viewChooserOption = this.page.testSubj.locator(VIEW_CHOOSER_TEST_SUBJECTS[view]);

    if (!(await viewChooserOption.isVisible())) {
      await this.viewChooser.click();
    }

    await viewChooserOption.click();
  }

  async openInspectorRequestsView() {
    await this.panel.waitFor({ state: 'visible' });

    if (!(await this.viewChooser.isVisible())) {
      return;
    }

    await this.openInspectorView('Requests');
  }

  async getTableData(): Promise<string[][]> {
    await this.panel.locator('tbody').waitFor({ state: 'visible' });
    const tableRows = this.panel.locator('tbody tr');

    return tableRows.evaluateAll((rows) =>
      rows.map((row) =>
        Array.from(row.querySelectorAll('td')).map((cell) => {
          const euiTableCellContent = cell.querySelector('.euiTableCellContent');
          return (euiTableCellContent ?? cell).textContent?.trim() ?? '';
        })
      )
    );
  }
}
