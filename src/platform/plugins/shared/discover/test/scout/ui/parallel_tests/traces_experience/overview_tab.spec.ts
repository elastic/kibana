/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  TRACES,
  RICH_TRACE,
  MINIMAL_TRACE,
  setupTracesExperience,
  teardownTracesExperience,
} from '../../fixtures/traces_experience';

spaceTest.describe(
  'Traces in Discover - Overview tab',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupTracesExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownTracesExperience(scoutSpace);
    });

    spaceTest('should show Overview tab in the document flyout', async ({ pageObjects }) => {
      await spaceTest.step('open first document in flyout', async () => {
        await pageObjects.tracesExperience.openDocumentFlyout(pageObjects.discover);
      });

      await spaceTest.step('verify Overview tab is present', async () => {
        await expect(pageObjects.tracesExperience.flyout.overviewTab).toBeVisible();
      });
    });

    spaceTest(
      'should always render the About and Similar Spans sections',
      async ({ pageObjects }) => {
        await spaceTest.step('open Overview tab', async () => {
          await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
        });

        await spaceTest.step('verify About section is visible', async () => {
          await expect(pageObjects.tracesExperience.flyout.aboutSection).toBeVisible({
            timeout: 30_000,
          });
        });

        await spaceTest.step('verify Similar Spans section is visible', async () => {
          await expect(pageObjects.tracesExperience.flyout.similarSpansSection).toBeVisible({
            timeout: 30_000,
          });
        });
      }
    );

    spaceTest('should render Similar Spans charts', async ({ pageObjects }) => {
      await spaceTest.step('open Overview tab', async () => {
        await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
      });

      await spaceTest.step('verify latency and duration distribution charts', async () => {
        await expect(pageObjects.tracesExperience.flyout.similarSpansLatencyChart).toBeVisible({
          timeout: 30_000,
        });
        await expect(
          pageObjects.tracesExperience.flyout.similarSpansDurationDistributionChart
        ).toBeVisible();
      });
    });

    spaceTest('should render the Trace Summary section with waterfall', async ({ pageObjects }) => {
      await spaceTest.step('open Overview tab', async () => {
        await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
      });

      await spaceTest.step('verify Trace Summary section is visible', async () => {
        await expect(pageObjects.tracesExperience.flyout.traceSummarySection).toBeVisible();
      });

      await spaceTest.step('verify waterfall is rendered', async () => {
        await expect(pageObjects.tracesExperience.flyout.traceWaterfallClickArea).toBeVisible({
          timeout: 30_000,
        });
      });
    });

    spaceTest('should render the Logs section', async ({ pageObjects }) => {
      await spaceTest.step('open Overview tab', async () => {
        await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
      });

      await spaceTest.step('verify Logs section is visible', async () => {
        await expect(pageObjects.tracesExperience.flyout.logsSection).toBeVisible();
      });
    });

    spaceTest('should render Errors section for documents with errors', async ({ pageObjects }) => {
      await spaceTest.step('filter for rich trace transaction', async () => {
        await pageObjects.discover.writeAndSubmitKqlQuery(
          `transaction.name: "${RICH_TRACE.TRANSACTION_NAME}"`
        );
      });

      await spaceTest.step('open Overview tab', async () => {
        await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
      });

      await spaceTest.step('verify Errors section is visible', async () => {
        await expect(pageObjects.tracesExperience.flyout.errorsSection).toBeVisible({
          timeout: 30_000,
        });
      });
    });

    spaceTest(
      'should not render Errors section for documents without errors',
      async ({ pageObjects }) => {
        await spaceTest.step('filter for minimal trace transaction', async () => {
          await pageObjects.discover.writeAndSubmitKqlQuery(
            `transaction.name: "${MINIMAL_TRACE.TRANSACTION_NAME}"`
          );
        });

        await spaceTest.step('open Overview tab', async () => {
          await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
        });

        await spaceTest.step('verify Errors section is not visible', async () => {
          await expect(pageObjects.tracesExperience.flyout.similarSpansSection).toBeVisible({
            timeout: 30_000,
          });
          await expect(pageObjects.tracesExperience.flyout.errorsSection).toBeHidden();
        });
      }
    );

    spaceTest(
      'should render Span Links section for spans with span links',
      async ({ pageObjects }) => {
        await spaceTest.step('filter for span with span links', async () => {
          await pageObjects.discover.writeAndSubmitKqlQuery(
            `span.name: "${RICH_TRACE.INTERNAL_SPAN_NAME}"`
          );
        });

        await spaceTest.step('open Overview tab', async () => {
          await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
        });

        await spaceTest.step('verify Span Links section is visible', async () => {
          await expect(pageObjects.tracesExperience.flyout.spanLinksSection).toBeVisible({
            timeout: 30_000,
          });
        });
      }
    );

    spaceTest(
      'should not render Span Links section for documents without span links',
      async ({ pageObjects }) => {
        await spaceTest.step('filter for minimal trace transaction', async () => {
          await pageObjects.discover.writeAndSubmitKqlQuery(
            `transaction.name: "${MINIMAL_TRACE.TRANSACTION_NAME}"`
          );
        });

        await spaceTest.step('open Overview tab', async () => {
          await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
        });

        await spaceTest.step('verify Span Links section is not visible', async () => {
          await expect(pageObjects.tracesExperience.flyout.similarSpansSection).toBeVisible({
            timeout: 30_000,
          });
          await expect(pageObjects.tracesExperience.flyout.spanLinksSection).toBeHidden();
        });
      }
    );

    spaceTest(
      'should render Overview tab with core sections in ESQL mode',
      async ({ pageObjects }) => {
        await spaceTest.step('switch to ESQL mode', async () => {
          await pageObjects.discover.writeAndSubmitEsqlQuery(TRACES.ESQL_QUERY);
        });

        await spaceTest.step('open Overview tab', async () => {
          await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
        });

        await spaceTest.step('verify About section is visible', async () => {
          await expect(pageObjects.tracesExperience.flyout.aboutSection).toBeVisible({
            timeout: 30_000,
          });
        });

        await spaceTest.step('verify Similar Spans section is visible', async () => {
          await expect(pageObjects.tracesExperience.flyout.similarSpansSection).toBeVisible({
            timeout: 30_000,
          });
        });

        await spaceTest.step('verify Trace Summary section is visible', async () => {
          await expect(pageObjects.tracesExperience.flyout.traceSummarySection).toBeVisible({
            timeout: 30_000,
          });
        });
      }
    );

    spaceTest(
      'should render Errors section in ESQL mode for documents with errors',
      async ({ pageObjects }) => {
        await spaceTest.step('run ESQL query filtering for rich trace', async () => {
          await pageObjects.discover.writeAndSubmitEsqlQuery(
            `${TRACES.ESQL_QUERY} | WHERE transaction.name == "${RICH_TRACE.TRANSACTION_NAME}"`
          );
        });

        await spaceTest.step('open Overview tab', async () => {
          await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
        });

        await spaceTest.step('verify Errors section is visible', async () => {
          await expect(pageObjects.tracesExperience.flyout.errorsSection).toBeVisible({
            timeout: 30_000,
          });
        });
      }
    );
  }
);
