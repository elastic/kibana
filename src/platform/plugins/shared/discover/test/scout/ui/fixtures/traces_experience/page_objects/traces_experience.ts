/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, PageObjects, ScoutPage } from '@kbn/scout';

const TRACE_COLUMNS = [
  '@timestamp',
  'service.name',
  'transaction.name',
  'span.name',
  'transaction.duration.us',
  'span.duration.us',
  'event.outcome',
];

const RED_METRICS_CHART_TITLES = ['Latency', 'Error Rate', 'Throughput'];

export class TracesExperiencePage {
  public readonly redMetricsGrid: Locator;
  public readonly overviewTab: Locator;
  public readonly similarSpansSection: Locator;
  public readonly similarSpansLatencyChart: Locator;
  public readonly traceSummarySection: Locator;
  public readonly traceWaterfallClickArea: Locator;
  public readonly traceWaterfallFullScreenButton: Locator;
  public readonly errorsSection: Locator;
  public readonly logsSection: Locator;
  public readonly spanLinksSection: Locator;

  constructor(private readonly page: ScoutPage) {
    this.redMetricsGrid = page.testSubj.locator('metricsExperienceGrid');
    this.overviewTab = page.testSubj.locator('docViewerTab-doc_view_obs_traces_overview');
    this.similarSpansSection = page.testSubj.locator('docViewerSimilarSpansSection');
    this.similarSpansLatencyChart = page.testSubj.locator('docViewerSimilarSpansLatencyChart');
    this.traceSummarySection = page.testSubj.locator('unifiedDocViewerTraceSummarySection');
    this.traceWaterfallClickArea = page.testSubj.locator(
      'unifiedDocViewerTraceSummaryTraceWaterfallClickArea'
    );
    this.traceWaterfallFullScreenButton = page.testSubj.locator(
      'unifiedDocViewerObservabilityTracesTraceFullScreenButton'
    );
    this.errorsSection = page.testSubj.locator('unifiedDocViewerErrorsAccordion');
    this.logsSection = page.testSubj.locator('unifiedDocViewerLogsSection');
    this.spanLinksSection = page.testSubj.locator('unifiedDocViewerSpanLinksAccordion');
  }

  public getRedMetricsChartTitle(title: string): Locator {
    return this.redMetricsGrid.getByText(title);
  }

  public async openDocumentFlyout(discover: PageObjects['discover'], rowIndex = 0) {
    await discover.waitForDocTableRendered();
    await discover.openAndWaitForDocViewerFlyout({ rowIndex });
  }

  public async openOverviewTab(discover: PageObjects['discover'], rowIndex = 0) {
    await this.openDocumentFlyout(discover, rowIndex);
    await this.overviewTab.click();
  }

  public get expectedColumns(): readonly string[] {
    return TRACE_COLUMNS;
  }

  public get profileSpecificColumns(): readonly string[] {
    return TRACE_COLUMNS.filter((col) => col !== '@timestamp');
  }

  public get expectedRedMetricsChartTitles(): readonly string[] {
    return RED_METRICS_CHART_TITLES;
  }
}
