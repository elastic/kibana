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
  OTEL_SERVICE,
  setupTracesExperience,
  teardownTracesExperience,
} from '../fixtures';
import type { TracesExperiencePage } from '../fixtures/page_objects/traces_experience';
import type { DiscoverPageObjects } from '../../../common/ui/fixtures';
import { openServiceFlyoutFromAboutSection } from '../fixtures/helpers';

const CHART_IDS = ['latency', 'throughput', 'failedTransactionRate'] as const;

// TEMP — delete before merge. Captures the ES|QL (document-based) service flyout for the
// PR before/after gallery. Set FLYOUT_SHOT_RUN=after for the post-migration run.
const FLYOUT_SHOT_RUN = process.env.FLYOUT_SHOT_RUN ?? 'before';
const flyoutShotPath = (name: string) =>
  `.playwright-mcp/flyout-migration/${FLYOUT_SHOT_RUN}/${name}.png`;

async function openServiceFlyoutAndVerifyCharts({
  tracesExperience,
  discover,
  esqlQuery,
}: {
  tracesExperience: TracesExperiencePage;
  discover: DiscoverPageObjects['discover'];
  esqlQuery: string;
}) {
  await spaceTest.step('navigate to Discover in ES|QL mode', async () => {
    await discover.goto({ queryMode: 'esql' });
  });

  await spaceTest.step('run ES|QL query', async () => {
    await discover.writeAndSubmitEsqlQuery(esqlQuery);
  });

  await spaceTest.step('open overview tab for the first row', async () => {
    await tracesExperience.openOverviewTab();
  });

  await spaceTest.step('open service flyout via service name link', async () => {
    await openServiceFlyoutFromAboutSection(tracesExperience.flyout);
  });

  await spaceTest.step('verify charts render without error', async () => {
    for (const chartId of CHART_IDS) {
      const chart = tracesExperience.flyout.serviceFlyout.chart(chartId);
      await expect(chart).toBeVisible();
      await expect(chart.locator('[data-test-subj="embeddable-lens-failure"]')).toBeHidden();
    }
  });
}

spaceTest.describe(
  'Traces in Discover - Service flyout',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupTracesExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownTracesExperience(scoutSpace);
    });

    spaceTest(
      'opens service flyout for an ECS service and renders its content',
      async ({ page, pageObjects }) => {
        const { tracesExperience, discover } = pageObjects;

        await openServiceFlyoutAndVerifyCharts({
          tracesExperience,
          discover,
          esqlQuery: `${TRACES.ESQL_QUERY} | WHERE service.name == "${RICH_TRACE.SERVICE_NAME}"`,
        });

        await spaceTest.step(
          'verify ECS schema: transaction type filter and transactions section are visible',
          async () => {
            await expect(tracesExperience.flyout.serviceFlyout.transactionTypeSelect).toBeVisible();
            await expect(tracesExperience.flyout.serviceFlyout.transactionsSection).toBeVisible();
          }
        );

        // TEMP — delete before merge (PR before/after gallery).
        await page.screenshot({ path: flyoutShotPath('overview-esql-ecs'), animations: 'disabled' });

        // TEMP — capture the footer Actions menu popover open.
        await page.testSubj.locator('serviceFlyoutActionsButton').click();
        await expect(page.locator('[data-test-subj^="serviceFlyoutActionsMenuItem-"]')).not.toHaveCount(
          0
        );
        await page.screenshot({ path: flyoutShotPath('footer-menu-esql-ecs'), animations: 'disabled' });
      }
    );

    spaceTest(
      'opens service flyout for an unprocessed OTel service and renders its content',
      async ({ page, pageObjects }) => {
        const { tracesExperience, discover } = pageObjects;

        await openServiceFlyoutAndVerifyCharts({
          tracesExperience,
          discover,
          esqlQuery: `${OTEL_SERVICE.ESQL_QUERY} | WHERE service.name == "${OTEL_SERVICE.SERVICE_NAME}"`,
        });

        await spaceTest.step(
          'verify OTel schema: transaction type filter and transactions section are hidden',
          async () => {
            await expect(tracesExperience.flyout.serviceFlyout.transactionTypeSelect).toBeHidden();
            await expect(tracesExperience.flyout.serviceFlyout.transactionsSection).toBeHidden();
          }
        );

        // TEMP — delete before merge (PR before/after gallery).
        await page.screenshot({ path: flyoutShotPath('overview-esql-otel'), animations: 'disabled' });

        // TEMP — capture the footer Actions menu popover open.
        await page.testSubj.locator('serviceFlyoutActionsButton').click();
        await expect(page.locator('[data-test-subj^="serviceFlyoutActionsMenuItem-"]')).not.toHaveCount(
          0
        );
        await page.screenshot({ path: flyoutShotPath('footer-menu-esql-otel'), animations: 'disabled' });
      }
    );
  }
);
