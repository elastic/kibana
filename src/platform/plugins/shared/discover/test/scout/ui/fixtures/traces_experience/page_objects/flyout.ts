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
  readonly serviceNameLink: Locator;
  readonly transactionNameLink: Locator;
  readonly dependencyNameLink: Locator;

  readonly similarSpansSection: Locator;
  readonly similarSpansDurationDistributionChart: Locator;
  readonly similarSpansOpenInDiscoverButton: Locator;

  readonly traceSummarySection: Locator;
  readonly traceWaterfallClickArea: Locator;
  readonly traceWaterfallFullScreenButton: Locator;
  readonly traceTimelineFlyout: Locator;
  readonly traceTimelineFlyoutBackButton: Locator;
  readonly traceSummaryOpenInDiscoverButton: Locator;

  readonly errorsSection: Locator;
  readonly errorsOpenInDiscoverButton: Locator;

  readonly logsSection: Locator;
  readonly logsOpenInDiscoverButton: Locator;

  readonly spanLinksSection: Locator;
  readonly spanLinksOpenInDiscoverButton: Locator;
}

export function createTracesFlyout(page: ScoutPage): TracesFlyout {
  return {
    overviewTab: page.testSubj.locator('docViewerTab-doc_view_obs_traces_overview'),

    aboutSection: page.testSubj.locator('UnifiedDocViewerTableGrid'),
    serviceNameLink: page.testSubj.locator(
      'unifiedDocViewerObservabilityTracesServiceNameLink'
    ),
    transactionNameLink: page.testSubj.locator(
      'unifiedDocViewerObservabilityTracesTransactionNameLink'
    ),
    dependencyNameLink: page.testSubj.locator('unifiedDocViewSpanOverviewDependencyNameLink'),

    similarSpansSection: page.testSubj.locator('docViewerSimilarSpansSection'),
    similarSpansDurationDistributionChart: page.testSubj.locator(
      'docViewerSimilarSpansDurationDistributionChart'
    ),
    similarSpansOpenInDiscoverButton: page.testSubj.locator(
      'docViewerSimilarSpansOpenInDiscoverButton'
    ),

    traceSummarySection: page.testSubj.locator('unifiedDocViewerTraceSummarySection'),
    traceWaterfallClickArea: page.testSubj.locator(
      'unifiedDocViewerTraceSummaryTraceWaterfallClickArea'
    ),
    traceWaterfallFullScreenButton: page.testSubj.locator(
      'unifiedDocViewerObservabilityTracesTraceFullScreenButton'
    ),
    traceTimelineFlyout: page.getByRole('dialog', { name: 'Trace timeline' }),
    traceTimelineFlyoutBackButton: page
      .getByRole('dialog', { name: 'Trace timeline' })
      .locator('[data-test-subj="euiFlyoutMenuBackButton"]'),
    traceSummaryOpenInDiscoverButton: page.testSubj.locator(
      'unifiedDocViewerObservabilityTracesOpenInDiscoverButton'
    ),

    errorsSection: page.testSubj.locator('unifiedDocViewerErrorsAccordion'),
    errorsOpenInDiscoverButton: page.testSubj.locator('docViewerErrorsOpenInDiscoverButton'),

    logsSection: page.testSubj.locator('unifiedDocViewerLogsSection'),
    logsOpenInDiscoverButton: page.testSubj.locator(
      'unifiedDocViewerLogsOpenInDiscoverButton'
    ),

    spanLinksSection: page.testSubj.locator('unifiedDocViewerSpanLinksAccordion'),
    spanLinksOpenInDiscoverButton: page.testSubj.locator(
      'docViewerSpanLinksOpenInDiscoverButton'
    ),
  };
}
