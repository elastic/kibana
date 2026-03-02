/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Grid activation and ES|QL command compatibility tests.
 *
 * These tests validate when the metrics grid activates (or does not) based on
 * different ES|QL commands. For pagination and search tests see grid.navigation.spec.ts.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE } from '../../fixtures/metrics_experience';

// Failing: See https://github.com/elastic/kibana/issues/254752
spaceTest.describe.skip(
  'Metrics in Discover - Grid',
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
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('should render metrics grid with cards', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;
      await expect(metricsExperience.grid).toBeVisible();
      await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
    });

    spaceTest('should render grid with WHERE filter', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(
        `${testData.ESQL_QUERIES.TS} | WHERE @timestamp > "${DEFAULT_TIME_RANGE.from}" - 100 DAYS`
      );
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });

    spaceTest('should render grid with LIMIT', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(`${testData.ESQL_QUERIES.TS} | LIMIT 5`);
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });

    spaceTest('should render grid with SORT', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(
        `${testData.ESQL_QUERIES.TS} | SORT @timestamp DESC`
      );
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });

    spaceTest('should not render grid with FROM command', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(testData.ESQL_QUERIES.FROM);
      await expect(pageObjects.metricsExperience.grid).toBeHidden();
    });

    spaceTest('should not render grid with STATS command', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(`${testData.ESQL_QUERIES.TS} | STATS count()`);
      await expect(pageObjects.metricsExperience.grid).toBeHidden();
    });

    spaceTest('should persist grid when changing time range', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience, datePicker } = pageObjects;
      await expect(metricsExperience.grid).toBeVisible();

      await datePicker.setCommonlyUsedTime('Last_30 days');

      await expect(metricsExperience.grid).toBeVisible();
    });
  }
);
