/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * "Recently explored" sort: interacting with a metric card records it, and the
 * recency sort surfaces interacted metrics first (most recent first). Gated
 * behind `discover.metricsExperienceSortEnabled`, enabled for the whole
 * parallel suite in `parallel_tests/global.setup.ts`.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE } from '../../fixtures/metrics_experience';

spaceTest.describe(
  'Metrics in Discover - Recently explored',
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
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'esql' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'moves interacted metrics to the front, most recent first',
      async ({ pageObjects }) => {
        await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        const { metricsExperience } = pageObjects;

        await expect(metricsExperience.grid).toBeVisible();

        const firstCardId = await metricsExperience.getCardByIndex(0).getAttribute('id');
        const secondCardId = await metricsExperience.getCardByIndex(1).getAttribute('id');
        expect(firstCardId).not.toBeNull();
        expect(secondCardId).not.toBeNull();

        // Interact with the second card, then the first, so the most-recent order is [first, second].
        await metricsExperience.recordInteraction(1);
        await metricsExperience.recordInteraction(0);

        await metricsExperience.selectSortBy('recency');

        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute(
          'id',
          String(firstCardId)
        );
        await expect(metricsExperience.getCardByIndex(1)).toHaveAttribute(
          'id',
          String(secondCardId)
        );
      }
    );
  }
);
