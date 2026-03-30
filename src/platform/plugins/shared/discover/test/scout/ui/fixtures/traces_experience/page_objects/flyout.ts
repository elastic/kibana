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

  readonly about: {
    readonly section: Locator;
    readonly serviceNameLink: Locator;
    readonly transactionNameLink: Locator;
    readonly dependencyNameLink: Locator;
  };

  readonly similarSpans: {
    readonly section: Locator;
    readonly durationDistributionChart: Locator;
    readonly openInDiscoverButton: Locator;
  };

  readonly traceSummary: {
    readonly section: Locator;
    readonly waterfallClickArea: Locator;
    readonly fullScreenButton: Locator;
    readonly openInDiscoverButton: Locator;
    readonly tourOkButton: Locator;
  };

  readonly errors: {
    readonly section: Locator;
    readonly openInDiscoverButton: Locator;
  };

  readonly logs: {
    readonly section: Locator;
    readonly openInDiscoverButton: Locator;
  };

  readonly spanLinks: {
    readonly section: Locator;
    readonly openInDiscoverButton: Locator;
  };

  readonly waterfallFlyout: {
    readonly container: Locator;
    readonly backButton: Locator;
    getWaterfallItem(name: string): {
      readonly row: Locator;
      readonly content: Locator;
      readonly errorBadge: Locator;
    };
    readonly childDocFlyout: {
      readonly aboutSection: Locator;
      readonly logMessage: Locator;
      readonly traceSummarySection: Locator;
      readonly errors: {
        readonly section: Locator;
        readonly openInDiscoverButton: Locator;
      };
      readonly logs: {
        readonly openInDiscoverButton: Locator;
      };
      readonly spanLinks: {
        readonly openInDiscoverButton: Locator;
      };
      close(): Promise<void>;
    };
  };
}

export function createTracesFlyout(page: ScoutPage): TracesFlyout {
  const timelineFlyout = page.getByRole('dialog', { name: 'Trace timeline' });

  return {
    overviewTab: page.testSubj.locator('docViewerTab-doc_view_obs_traces_overview'),

    about: {
      section: page.testSubj.locator('UnifiedDocViewerTableGrid'),
      serviceNameLink: page.testSubj.locator('unifiedDocViewerObservabilityTracesServiceNameLink'),
      transactionNameLink: page.testSubj.locator(
        'unifiedDocViewerObservabilityTracesTransactionNameLink'
      ),
      dependencyNameLink: page.testSubj.locator('unifiedDocViewSpanOverviewDependencyNameLink'),
    },

    similarSpans: {
      section: page.testSubj.locator('docViewerSimilarSpansSection'),
      durationDistributionChart: page.testSubj.locator(
        'docViewerSimilarSpansDurationDistributionChart'
      ),
      openInDiscoverButton: page.testSubj.locator('docViewerSimilarSpansOpenInDiscoverButton'),
    },

    traceSummary: {
      section: page.testSubj.locator('unifiedDocViewerTraceSummarySection'),
      waterfallClickArea: page.testSubj.locator(
        'unifiedDocViewerTraceSummaryTraceWaterfallClickArea'
      ),
      fullScreenButton: page.testSubj.locator(
        'unifiedDocViewerObservabilityTracesTraceFullScreenButton'
      ),
      openInDiscoverButton: page.testSubj.locator(
        'unifiedDocViewerObservabilityTracesOpenInDiscoverButton'
      ),
      tourOkButton: page.testSubj.locator('traceWaterfallFullScreenActionTourOkButton'),
    },

    errors: {
      section: page.testSubj.locator('unifiedDocViewerErrorsAccordion'),
      openInDiscoverButton: page.testSubj.locator('docViewerErrorsOpenInDiscoverButton'),
    },

    logs: {
      section: page.testSubj.locator('unifiedDocViewerLogsSection'),
      openInDiscoverButton: page.testSubj.locator('unifiedDocViewerLogsOpenInDiscoverButton'),
    },

    spanLinks: {
      section: page.testSubj.locator('unifiedDocViewerSpanLinksAccordion'),
      openInDiscoverButton: page.testSubj.locator('docViewerSpanLinksOpenInDiscoverButton'),
    },

    waterfallFlyout: (() => {
      const childDocContainer = page.locator('[id^="documentDetailFlyout"]');
      return {
        container: timelineFlyout,
        backButton: timelineFlyout.locator('[data-test-subj="euiFlyoutMenuBackButton"]'),
        getWaterfallItem(name: string) {
          const row = timelineFlyout
            .locator('[data-test-subj="traceItemRowWrapper"]')
            .filter({ hasText: name });
          return {
            row,
            content: row.locator('[data-test-subj="traceItemRowContent"]'),
            errorBadge: row.locator('[data-test-subj="apmBarDetailsErrorBadge"]'),
          };
        },
        childDocFlyout: {
          aboutSection: childDocContainer.locator('[data-test-subj="UnifiedDocViewerTableGrid"]'),
          logMessage: childDocContainer.locator(
            '[data-test-subj="unifiedDocViewLogsOverviewMessage"]'
          ),
          traceSummarySection: childDocContainer.locator(
            '[data-test-subj="unifiedDocViewerTraceSummarySection"]'
          ),
          errors: {
            section: childDocContainer.locator(
              '[data-test-subj="unifiedDocViewerErrorsAccordion"]'
            ),
            openInDiscoverButton: childDocContainer.locator(
              '[data-test-subj="docViewerErrorsOpenInDiscoverButton"]'
            ),
          },
          logs: {
            openInDiscoverButton: childDocContainer.locator(
              '[data-test-subj="unifiedDocViewerLogsOpenInDiscoverButton"]'
            ),
          },
          spanLinks: {
            openInDiscoverButton: childDocContainer.locator(
              '[data-test-subj="docViewerSpanLinksOpenInDiscoverButton"]'
            ),
          },
          async close() {
            await page.keyboard.press('Escape');
            await childDocContainer.waitFor({ state: 'detached' });
          },
        },
      };
    })(),
  };
}
