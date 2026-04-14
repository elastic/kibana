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
  setupTracesExperience,
  teardownTracesExperience,
  expectTracesExperienceEnabled,
} from '../../fixtures/traces_experience';
import {
  setupSlosForTracesExperience,
  teardownSlosForTracesExperience,
  SLO_HISTORY_APP_STATE,
} from '../../fixtures/traces_experience/slo_setup';
import type { SloIds } from '../../fixtures/traces_experience/slo_setup';

const SLO_HISTORY_PARAMS = {
  _a: SLO_HISTORY_APP_STATE,
};

spaceTest.describe(
  'Traces in Discover - Explore from SLO',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    let sloIds: SloIds;

    spaceTest.beforeAll(async ({ scoutSpace, kbnClient, config }) => {
      await setupTracesExperience(scoutSpace, config);
      sloIds = await setupSlosForTracesExperience(scoutSpace, kbnClient);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace, kbnClient }) => {
      await teardownSlosForTracesExperience(kbnClient, scoutSpace.id, sloIds);
      await teardownTracesExperience(scoutSpace);
    });

    spaceTest(
      'APM latency SLO - "View events" link opens traces experience with event type control',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to SLO History tab with synthtrace time range', async () => {
          await page.gotoApp(`slo/${sloIds.latency}/history`, {
            params: SLO_HISTORY_PARAMS,
          });
          await expect(page.testSubj.locator('eventsChartPanel')).toBeVisible();
        });

        await spaceTest.step('"View events" link opens traces experience in Discover', async () => {
          await page.testSubj.locator('sloDetailDiscoverLink').click();
          await expectTracesExperienceEnabled(pageObjects);
        });

        await spaceTest.step('event type control is visible with "All" selected', async () => {
          await expect(pageObjects.tracesExperience.controls.sloEventControl).toBeVisible();
          await expect(
            pageObjects.tracesExperience.controls.getSloEventControlSelectedValue('All')
          ).toBeVisible();
        });
      }
    );

    spaceTest(
      'APM availability SLO - "View events" link opens traces experience with event type control',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to SLO History tab with synthtrace time range', async () => {
          await page.gotoApp(`slo/${sloIds.availability}/history`, {
            params: SLO_HISTORY_PARAMS,
          });
          await expect(page.testSubj.locator('eventsChartPanel')).toBeVisible();
        });

        await spaceTest.step('"View events" link opens traces experience in Discover', async () => {
          await page.testSubj.locator('sloDetailDiscoverLink').click();
          await expectTracesExperienceEnabled(pageObjects);
        });

        await spaceTest.step('event type control is visible with "All" selected', async () => {
          await expect(pageObjects.tracesExperience.controls.sloEventControl).toBeVisible();
          await expect(
            pageObjects.tracesExperience.controls.getSloEventControlSelectedValue('All')
          ).toBeVisible();
        });
      }
    );

    spaceTest(
      'APM latency SLO - "Traces in Discover" from SLI chart opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to SLO History tab with synthtrace time range', async () => {
          await page.gotoApp(`slo/${sloIds.latency}/history`, {
            params: SLO_HISTORY_PARAMS,
          });
          await expect(page.testSubj.locator('sliChartPanel')).toBeVisible();
        });

        await spaceTest.step('open SLI chart actions and click "Traces in Discover"', async () => {
          await page.testSubj.locator('sliChartActionsButton').click();
          await expect(page.testSubj.locator('sliHistoryChartOpenInDiscoverLink')).toBeVisible();
          await page.testSubj.locator('sliHistoryChartOpenInDiscoverLink').click();
          await expectTracesExperienceEnabled(pageObjects);
        });
      }
    );
  }
);
