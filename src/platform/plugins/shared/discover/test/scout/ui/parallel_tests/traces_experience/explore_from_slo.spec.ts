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
  RICH_TRACE,
  setupTracesExperience,
  teardownTracesExperience,
} from '../../fixtures/traces_experience';

const APM_SLO_PAYLOAD = {
  name: 'E2E APM SLO - Explore from SLO',
  description: 'APM SLO for testing traces in Discover navigation from SLO details',
  indicator: {
    type: 'sli.apm.transactionDuration',
    params: {
      service: RICH_TRACE.SERVICE_NAME,
      environment: 'production',
      transactionType: 'request',
      transactionName: RICH_TRACE.TRANSACTION_NAME,
      threshold: 500,
      index: 'metrics-apm*',
    },
  },
  budgetingMethod: 'occurrences',
  timeWindow: {
    duration: '30d',
    type: 'rolling',
  },
  objective: {
    target: 0.99,
  },
  tags: ['e2e-test'],
};

const TEST_TIMEOUT = 3 * 60 * 1000;

spaceTest.describe(
  'Traces in Discover - Explore from SLO',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    // eslint-disable-next-line @kbn/eslint/scout_no_describe_configure
    spaceTest.describe.configure({ timeout: TEST_TIMEOUT });

    let sloId: string | undefined;

    spaceTest.beforeAll(async ({ scoutSpace, config, kbnClient }) => {
      await setupTracesExperience(scoutSpace, config);

      const { data } = await kbnClient.request({
        method: 'POST',
        path: `/s/${scoutSpace.id}/api/observability/slos`,
        body: APM_SLO_PAYLOAD,
      });
      sloId = (data as { id: string }).id;
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ scoutSpace, kbnClient }) => {
      if (sloId) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/s/${scoutSpace.id}/api/observability/slos/${sloId}`,
        });
      }
      await teardownTracesExperience(scoutSpace);
    });

    spaceTest(
      'SLO Details - "Traces in Discover" from SLI chart opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to SLO details page', async () => {
          await expect(async () => {
            await page.gotoApp(`slo/${sloId}`);
            await expect(page.testSubj.locator('sliChartPanel')).toBeVisible({
              timeout: 10000,
            });
          }).toPass({ intervals: [5000], timeout: TEST_TIMEOUT });
        });

        await spaceTest.step(
          'click "Traces in Discover" and verify traces experience',
          async () => {
            await page.testSubj.locator('sliChartActionsButton').click();
            await expect(page.testSubj.locator('sliHistoryChartOpenInDiscoverLink')).toBeVisible();
            await page.testSubj.locator('sliHistoryChartOpenInDiscoverLink').click();
            await page.waitForURL('**/app/discover**');
            for (const column of pageObjects.tracesExperience.grid.profileSpecificColumns) {
              await expect(page.testSubj.locator(`field-${column}-showDetails`)).toBeVisible();
            }
          }
        );
      }
    );
  }
);
