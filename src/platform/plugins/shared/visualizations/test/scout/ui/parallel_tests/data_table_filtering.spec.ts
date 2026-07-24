/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  testData,
  loadVisualizeSuiteDefaults,
  cleanupVisualizeSuiteDefaults,
} from '../fixtures';

spaceTest.describe(
  'Visualize - data table - time filtering',
  { tag: ['@local-stateful-classic'] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await loadVisualizeSuiteDefaults(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await cleanupVisualizeSuiteDefaults(scoutSpace);
    });

    spaceTest(
      'filters correctly for applied and pinned time filters',
      async ({ pageObjects: { visualize, visEditor, visChart, filterBar, renderable } }) => {
        await spaceTest.step('build a date histogram data table', async () => {
          await visualize.createAggBasedVisualization(
            'table',
            testData.DATA_VIEW.LOGSTASH_TIME_BASED
          );
          await visEditor.clickBucket('Split rows');
          await visEditor.selectAggregation('Date Histogram');
          await visEditor.selectField('@timestamp');
          await visEditor.setInterval('Day');
          await visEditor.clickGo();
        });

        await spaceTest.step(
          'filters for an applied time filter on the main timefield',
          async () => {
            await filterBar.addFilter({
              field: '@timestamp',
              operator: 'is between',
              value: { from: '2015-09-19', to: '2015-09-21' },
            });
            await renderable.waitForRender();

            expect(await visChart.getTableVisContent()).toStrictEqual([['2015-09-20', '4,757']]);
          }
        );

        await spaceTest.step('filters correctly for pinned filters', async () => {
          await filterBar.toggleFilterPinned('@timestamp');
          await renderable.waitForRender();

          expect(await visChart.getTableVisContent()).toStrictEqual([['2015-09-20', '4,757']]);
        });
      }
    );
  }
);
