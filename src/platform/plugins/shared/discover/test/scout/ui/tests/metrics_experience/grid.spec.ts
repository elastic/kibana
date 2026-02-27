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
import { test, testData, DEFAULT_TIME_RANGE } from '../../fixtures/metrics_experience';

test.describe(
  'Metrics in Discover - Grid',
  {
    tag: testData.METRICS_EXPERIENCE_TAGS,
  },
  () => {
    test.beforeAll(async ({ kbnClient, uiSettings }) => {
      await kbnClient.importExport.load(testData.KBN_ARCHIVE);
      await uiSettings.set({
        defaultIndex: testData.DATA_VIEW_NAME,
        'timepicker:timeDefaults': `{ "from": "${DEFAULT_TIME_RANGE.from}", "to": "${DEFAULT_TIME_RANGE.to}"}`,
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('should render metrics grid with cards', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;
      await expect(metricsExperience.grid).toBeVisible();
      await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
    });

    test('should render grid with WHERE filter', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(
        `${testData.ESQL_QUERIES.TS} | WHERE @timestamp > "${DEFAULT_TIME_RANGE.from}" - 100 DAYS`
      );
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });

    test('should render grid with LIMIT', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(`${testData.ESQL_QUERIES.TS} | LIMIT 5`);
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });

    test('should render grid with SORT', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(
        `${testData.ESQL_QUERIES.TS} | SORT @timestamp DESC`
      );
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });

    test('should not render grid with FROM command', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(testData.ESQL_QUERIES.FROM);
      await expect(pageObjects.metricsExperience.grid).toBeHidden();
    });

    test('should not render grid with STATS command', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(`${testData.ESQL_QUERIES.TS} | STATS count()`);
      await expect(pageObjects.metricsExperience.grid).toBeHidden();
    });

    test('should persist grid when changing time range', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience, datePicker } = pageObjects;
      await expect(metricsExperience.grid).toBeVisible();

      await datePicker.setCommonlyUsedTime('Last_30 days');

      await expect(metricsExperience.grid).toBeVisible();
    });
  }
);
