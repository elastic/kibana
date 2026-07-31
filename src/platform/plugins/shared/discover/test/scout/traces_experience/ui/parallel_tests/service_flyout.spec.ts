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
import type { ScoutPage } from '@kbn/scout';
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

const CHART_IDS = ['latency', 'throughput', 'failedTransactionRate'] as const;

async function openServiceFlyoutAndVerifyCharts({
  page,
  tracesExperience,
  discover,
  esqlQuery,
}: {
  page: ScoutPage;
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

  await spaceTest.step('click the service name link to open the service flyout', async () => {
    await expect(tracesExperience.flyout.about.serviceNameLink).toBeVisible();
    // Move pointer away so the row's hover action buttons don't appear and intercept the click,
    // then fire a native DOM click without moving the pointer back over the element.
    await page.mouse.move(0, 0);
    await tracesExperience.flyout.about.serviceNameLink.evaluate((el: HTMLElement) => el.click());
  });

  await spaceTest.step('verify service flyout is visible', async () => {
    await expect(tracesExperience.flyout.serviceFlyout.container).toBeVisible();
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
      async ({ pageObjects, page }) => {
        const { tracesExperience, discover } = pageObjects;

        await openServiceFlyoutAndVerifyCharts({
          page,
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
      }
    );

    spaceTest(
      'opens service flyout for an unprocessed OTel service and renders its content',
      async ({ pageObjects, page }) => {
        const { tracesExperience, discover } = pageObjects;

        await openServiceFlyoutAndVerifyCharts({
          page,
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
      }
    );
  }
);
