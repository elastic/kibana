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
import type { PageObjects } from '@kbn/scout';
import {
  spaceTest,
  TRACES,
  RICH_TRACE,
  MINIMAL_TRACE,
  setupTracesExperience,
  teardownTracesExperience,
} from '../../fixtures/traces_experience';

type DiscoverPage = PageObjects['discover'];

const queryModes = [
  {
    name: 'Classic',
    filterMinimal: (discover: DiscoverPage) =>
      discover.writeAndSubmitKqlQuery(`transaction.name: "${MINIMAL_TRACE.TRANSACTION_NAME}"`),
    filterRichSpan: (discover: DiscoverPage) =>
      discover.writeAndSubmitKqlQuery(`span.name: "${RICH_TRACE.INTERNAL_SPAN_NAME}"`),
  },
  {
    name: 'ES|QL',
    filterMinimal: (discover: DiscoverPage) =>
      discover.writeAndSubmitEsqlQuery(
        `${TRACES.ESQL_QUERY} | WHERE transaction.name == "${MINIMAL_TRACE.TRANSACTION_NAME}"`
      ),
    filterRichSpan: (discover: DiscoverPage) =>
      discover.writeAndSubmitEsqlQuery(
        `${TRACES.ESQL_QUERY} | WHERE span.name == "${RICH_TRACE.INTERNAL_SPAN_NAME}"`
      ),
  },
];

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

    for (const mode of queryModes) {
      spaceTest(
        `${mode.name} mode - should render always-visible sections and hide conditional ones for a minimal document`,
        async ({ pageObjects }) => {
          await spaceTest.step(`${mode.name} mode - filter for minimal trace`, async () => {
            await mode.filterMinimal(pageObjects.discover);
          });

          await spaceTest.step('open Overview tab', async () => {
            await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
          });

          await spaceTest.step('verify About section is visible', async () => {
            await expect(pageObjects.tracesExperience.flyout.aboutSection).toBeVisible();
          });

          await spaceTest.step('verify Similar Spans section is visible', async () => {
            await expect(pageObjects.tracesExperience.flyout.similarSpansSection).toBeVisible();
          });

          await spaceTest.step('verify Trace Summary section is visible', async () => {
            await expect(pageObjects.tracesExperience.flyout.traceSummarySection).toBeVisible();
          });

          await spaceTest.step('verify Logs section is visible', async () => {
            await expect(pageObjects.tracesExperience.flyout.logsSection).toBeVisible();
          });

          await spaceTest.step('verify Errors section is hidden', async () => {
            await expect(pageObjects.tracesExperience.flyout.errorsSection).toBeHidden();
          });

          await spaceTest.step('verify Span Links section is hidden', async () => {
            await expect(pageObjects.tracesExperience.flyout.spanLinksSection).toBeHidden();
          });
        }
      );

      spaceTest(
        `${mode.name} mode - should render conditional sections for a document with errors and span links`,
        async ({ pageObjects }) => {
          await spaceTest.step(
            `${mode.name} mode - filter for span with errors and span links`,
            async () => {
              await mode.filterRichSpan(pageObjects.discover);
            }
          );

          await spaceTest.step('open Overview tab', async () => {
            await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
          });

          await spaceTest.step('verify Errors section is visible', async () => {
            await expect(pageObjects.tracesExperience.flyout.errorsSection).toBeVisible({
              timeout: 30_000,
            });
          });

          await spaceTest.step('verify Span Links section is visible', async () => {
            await expect(pageObjects.tracesExperience.flyout.spanLinksSection).toBeVisible({
              timeout: 30_000,
            });
          });
        }
      );
    }
  }
);
