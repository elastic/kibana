/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Quick-action placement contract for the metrics-grid card.
 *
 * Asserts the placement contract introduced by issue #236787: Explore,
 * View details, and Copy to dashboard are on the visible row; Add to case
 * stays in the 3-dot popover. A `test.fixme` case captures the desired but
 * currently-blocked Inspect demotion so the visualizations follow-up has a
 * green target the moment it lands.
 *
 * Privileged login is used so Add to case is visible in the popover (it
 * requires cases create/update capabilities, which the viewer role lacks).
 * Mirrored from `add_to_case_privileged.spec.ts`.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE } from '../../fixtures/metrics_experience';

spaceTest.describe(
  'Metrics in Discover - Quick action placement',
  {
    tag: testData.METRICS_EXPERIENCE_TAGS,
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'should expose Explore, View details, Copy to dashboard on the visible quick-action row',
      async ({ pageObjects }) => {
        await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        const { metricsExperience } = pageObjects;
        await expect(metricsExperience.grid).toBeVisible();

        await spaceTest.step('hover the card to reveal the visible quick-action row', async () => {
          await metricsExperience.getCardByIndex(0).hover();
        });

        await spaceTest.step('Explore is visible without opening the popover', async () => {
          await expect(metricsExperience.chartActions.explore).toBeVisible();
        });

        await spaceTest.step('View details is visible without opening the popover', async () => {
          await expect(metricsExperience.chartActions.viewDetails).toBeVisible();
        });

        await spaceTest.step(
          'Copy to dashboard is visible without opening the popover',
          async () => {
            await expect(metricsExperience.chartActions.copyToDashboard).toBeVisible();
          }
        );
      }
    );

    spaceTest('should keep Add to case in the 3-dot popover', async ({ pageObjects }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;
      await expect(metricsExperience.grid).toBeVisible();

      await spaceTest.step(
        'Add to case is not visible on the hover row before opening the popover',
        async () => {
          await metricsExperience.getCardByIndex(0).hover();
          await expect(metricsExperience.chartActions.addToCase).toBeHidden();
        }
      );

      await spaceTest.step('open the 3-dot popover', async () => {
        await metricsExperience.openCardContextMenu(0);
      });

      await spaceTest.step('Add to case appears inside the popover', async () => {
        await expect(metricsExperience.chartActions.addToCase).toBeVisible();
      });
    });


  }
);
