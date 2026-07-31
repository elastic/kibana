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

        await spaceTest.step('navigate to Discover in ES|QL mode', async () => {
          await discover.goto({ queryMode: 'esql' });
        });

        await spaceTest.step('run ES|QL query scoped to the ECS service', async () => {
          await discover.writeAndSubmitEsqlQuery(
            `${TRACES.ESQL_QUERY} | WHERE service.name == "${RICH_TRACE.SERVICE_NAME}"`
          );
        });

        await spaceTest.step('open overview tab for the first row', async () => {
          await tracesExperience.openOverviewTab();
        });

        await spaceTest.step('click the service name link to open the service flyout', async () => {
          await tracesExperience.flyout.about.serviceNameLink.click({ force: true });
        });

        await spaceTest.step('verify service flyout is visible', async () => {
          await expect(tracesExperience.flyout.serviceFlyout.container).toBeVisible();
        });

        await spaceTest.step('verify charts render without error', async () => {
          for (const chartId of ['latency', 'throughput', 'failedTransactionRate']) {
            const chart = page.testSubj.locator(`serviceFlyoutLensChart-${chartId}`);
            await expect(chart).toBeVisible();
            await expect(chart.locator('[data-test-subj="embeddable-lens-failure"]')).toBeHidden();
          }
        });

        await spaceTest.step(
          'verify ECS schema: transaction type filter and transactions section are visible',
          async () => {
            await expect(page.testSubj.locator('serviceFlyoutTransactionTypeSelect')).toBeVisible();
            await expect(page.testSubj.locator('serviceFlyoutSection-transactions')).toBeVisible();
          }
        );
      }
    );

    spaceTest(
      'opens service flyout for an unprocessed OTel service and renbders its content',
      async ({ page, pageObjects }) => {
        const { tracesExperience, discover } = pageObjects;

        await spaceTest.step('navigate to Discover in ES|QL mode', async () => {
          await discover.goto({ queryMode: 'esql' });
        });

        await spaceTest.step('run ES|QL query scoped to the OTel service', async () => {
          await discover.writeAndSubmitEsqlQuery(
            `${OTEL_SERVICE.ESQL_QUERY} | WHERE service.name == "${OTEL_SERVICE.SERVICE_NAME}"`
          );
        });

        await spaceTest.step('open overview tab for the first row', async () => {
          await tracesExperience.openOverviewTab();
        });

        await spaceTest.step('click the service name link to open the service flyout', async () => {
          await tracesExperience.flyout.about.serviceNameLink.click({ force: true });
        });

        await spaceTest.step('verify service flyout is visible', async () => {
          await expect(tracesExperience.flyout.serviceFlyout.container).toBeVisible();
        });

        await spaceTest.step('verify charts render without error', async () => {
          for (const chartId of ['latency', 'throughput', 'failedTransactionRate']) {
            const chart = page.testSubj.locator(`serviceFlyoutLensChart-${chartId}`);
            await expect(chart).toBeVisible();
            await expect(chart.locator('[data-test-subj="embeddable-lens-failure"]')).toBeHidden();
          }
        });

        await spaceTest.step(
          'verify OTel schema: transaction type filter and transactions section are hidden',
          async () => {
            await expect(page.testSubj.locator('serviceFlyoutTransactionTypeSelect')).toBeHidden();
            await expect(page.testSubj.locator('serviceFlyoutSection-transactions')).toBeHidden();
          }
        );
      }
    );
  }
);
