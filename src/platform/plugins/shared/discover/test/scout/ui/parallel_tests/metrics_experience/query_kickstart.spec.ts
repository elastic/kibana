/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE } from '../../fixtures/metrics_experience';

spaceTest.describe(
  'Metrics in Discover - Query kickstart',
  {
    tag: testData.RECOMMENDED_QUERY_TAGS,
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

    spaceTest('should apply Search all metrics recommended query', async ({ pageObjects }) => {
      const { discover } = pageObjects;

      await spaceTest.step('submit a TS query to enable extensions fetch', async () => {
        await discover.writeAndSubmitEsqlQuery(`${testData.ESQL_QUERIES.TS} | LIMIT 100`);
      });

      await spaceTest.step('verify Search all metrics is available and apply it', async () => {
        await discover.runRecommendedEsqlQuery(
          testData.RECOMMENDED_QUERY_LABELS.SEARCH_ALL_METRICS
        );
      });

      await spaceTest.step('verify the recommended query popover closed', async () => {
        await expect(discover.esqlMenuPopover).toBeHidden();
      });

      await spaceTest.step(
        'verify the recommended query replaced the editor content with a TS query',
        async () => {
          const editorValue = await discover.getEsqlQueryValue();
          expect(editorValue).toContain('TS');
          expect(editorValue).toContain('metrics-');
        }
      );
    });

    spaceTest(
      'should enter the metrics experience when typing a TS query directly',
      async ({ pageObjects }) => {
        const { discover, metricsExperience } = pageObjects;

        await spaceTest.step('type and submit a TS query', async () => {
          await discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        });

        await spaceTest.step('verify the editor contains the typed TS query verbatim', async () => {
          const editorValue = await discover.getEsqlQueryValue();
          expect(editorValue).toBe(testData.ESQL_QUERIES.TS);
        });

        await spaceTest.step('verify the metrics experience grid is rendered', async () => {
          await expect(metricsExperience.grid).toBeVisible();
        });
      }
    );
  }
);
