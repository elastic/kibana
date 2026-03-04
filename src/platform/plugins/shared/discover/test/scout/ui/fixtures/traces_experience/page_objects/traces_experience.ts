/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import type { TracesFlyout } from './flyout';
import type { TracesGrid } from './grid';
import type { TracesCharts } from './charts';
import { createTracesFlyout } from './flyout';
import { createTracesGrid } from './grid';
import { createTracesCharts } from './charts';

export class TracesExperiencePage {
  public readonly flyout: TracesFlyout;
  public readonly grid: TracesGrid;
  public readonly charts: TracesCharts;

  constructor(page: ScoutPage) {
    this.flyout = createTracesFlyout(page);
    this.grid = createTracesGrid();
    this.charts = createTracesCharts(page);
  }

  public async openDocumentFlyout(discover: PageObjects['discover'], rowIndex = 0) {
    await discover.waitForDocTableRendered();
    await discover.openAndWaitForDocViewerFlyout({ rowIndex });
  }

  public async openOverviewTab(discover: PageObjects['discover'], rowIndex = 0) {
    await this.openDocumentFlyout(discover, rowIndex);
    await this.flyout.overviewTab.click();
  }
}
