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
 * Scope: this spec is intentionally narrow and only covers the popover side of
 * the contract — that "Add to case" stays inside the 3-dot overflow menu and
 * is NOT promoted to the visible quick-action row. The visible-row side of
 * the contract (Explore, View details, Copy to dashboard rendered without
 * opening the popover) is already covered by `grid.spec.ts`'s
 * "should show chart actions menu on metric card" test, so re-asserting it
 * here would be duplicate coverage.
 *
 * IMPORTANT: This spec logs in via `loginAsPrivilegedUser()` (see `beforeEach`
 * below). The "Add to case" action is gated on the `cases` feature's
 * `create`/`update` capabilities and is filtered out for users without them.
 * A regular (non-privileged) user would therefore never see `addToCase`, the
 * assertion would fail, and the contract this spec exists to protect would be
 * silently un-tested. The privileged login is required, not incidental — do
 * not weaken it to a regular user.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE } from '../../fixtures/metrics_experience';

spaceTest.describe(
  'Metrics in Discover - Quick action placement (popover)',
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

    spaceTest('should keep Add to case in the 3-dot popover', async ({ pageObjects }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;
      await expect(metricsExperience.grid).toBeVisible();

      await spaceTest.step(
        'Add to case is not visible on the hover row before opening the popover',
        async () => {
          await metricsExperience.getCardByIndex(0).hover();
          await expect(metricsExperience.chartActionsFor(0).addToCase).toBeHidden();
        }
      );

      await spaceTest.step('open the 3-dot popover', async () => {
        await metricsExperience.openCardContextMenu(0);
      });

      await spaceTest.step('Add to case appears inside the popover', async () => {
        await expect(metricsExperience.chartActionsFor(0).addToCase).toBeVisible();
      });
    });
  }
);
