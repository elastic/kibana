/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export interface TracesFlyout {
  readonly overviewTab: Locator;
  readonly aboutSection: Locator;
  readonly similarSpansSection: Locator;
  readonly similarSpansLatencyChart: Locator;
  readonly similarSpansDurationDistributionChart: Locator;
  readonly traceSummarySection: Locator;
  readonly traceWaterfallClickArea: Locator;
  readonly traceWaterfallFullScreenButton: Locator;
  readonly errorsSection: Locator;
  readonly logsSection: Locator;
  readonly spanLinksSection: Locator;
}

export function createTracesFlyout(page: ScoutPage): TracesFlyout {
  return {
    overviewTab: page.testSubj.locator('docViewerTab-doc_view_obs_traces_overview'),
    aboutSection: page.testSubj.locator('UnifiedDocViewerTableGrid'),
    similarSpansSection: page.testSubj.locator('docViewerSimilarSpansSection'),
    similarSpansLatencyChart: page.testSubj.locator('docViewerSimilarSpansLatencyChart'),
    similarSpansDurationDistributionChart: page.testSubj.locator(
      'docViewerSimilarSpansDurationDistributionChart'
    ),
    traceSummarySection: page.testSubj.locator('unifiedDocViewerTraceSummarySection'),
    traceWaterfallClickArea: page.testSubj.locator(
      'unifiedDocViewerTraceSummaryTraceWaterfallClickArea'
    ),
    traceWaterfallFullScreenButton: page.testSubj.locator(
      'unifiedDocViewerObservabilityTracesTraceFullScreenButton'
    ),
    errorsSection: page.testSubj.locator('unifiedDocViewerErrorsAccordion'),
    logsSection: page.testSubj.locator('unifiedDocViewerLogsSection'),
    spanLinksSection: page.testSubj.locator('unifiedDocViewerSpanLinksAccordion'),
  };
}
