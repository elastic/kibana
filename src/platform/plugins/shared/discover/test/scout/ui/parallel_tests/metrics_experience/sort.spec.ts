/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Sort control tests: the sort selector is gated behind the
 * `discover.metricsExperienceSortEnabled` feature flag, which is enabled once
 * for the whole parallel suite in `parallel_tests/global.setup.ts`.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  testData,
  DEFAULT_TIME_RANGE,
  DEFAULT_CONFIG,
} from '../../fixtures/metrics_experience';

const ALPHABETICALLY_SORTED_METRICS = [...DEFAULT_CONFIG.metrics].sort((a, b) =>
  a.name.localeCompare(b.name)
);
const FIRST_CARD_ASC = `${ALPHABETICALLY_SORTED_METRICS[0].name}-0`;
const FIRST_CARD_DESC = `${
  ALPHABETICALLY_SORTED_METRICS[ALPHABETICALLY_SORTED_METRICS.length - 1].name
}-0`;

spaceTest.describe(
  'Metrics in Discover - Sorting',
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
      'shows the sort control when the feature flag is enabled',
      async ({ pageObjects }) => {
        await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        const { metricsExperience } = pageObjects;

        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.sortSelectorButton).toBeVisible();
        await expect(metricsExperience.sortDirectionAsc).toBeVisible();
        await expect(metricsExperience.sortDirectionDesc).toBeVisible();
      }
    );

    spaceTest('reorders the grid when toggling sort direction', async ({ pageObjects }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;

      await spaceTest.step('defaults to ascending order', async () => {
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_ASC);
      });

      await spaceTest.step('descending puts the last metric first', async () => {
        await metricsExperience.setSortDirection('desc');
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_DESC);
      });

      await spaceTest.step('ascending restores the original order', async () => {
        await metricsExperience.setSortDirection('asc');
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_ASC);
      });
    });
  }
);
