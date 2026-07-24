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
  'Visualize - data table on an index without a time filter',
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
      'applies/resets params, saves, loads, and shows correct data',
      async ({ pageObjects: { visualize, visEditor, inspector } }) => {
        const visName = 'Visualization DataTable without time filter';

        await spaceTest.step('build a bytes histogram data table', async () => {
          await visualize.createAggBasedVisualization(
            'table',
            testData.DATA_VIEW.LOGSTASH_NON_TIME_BASED
          );
          await visEditor.clickBucket('Split rows');
          await visEditor.selectAggregation('Histogram');
          await visEditor.selectField('bytes');
          await visEditor.setInterval('2000', { type: 'numeric' });
          await visEditor.clickGo();
        });

        await spaceTest.step('allows applying changed params', async () => {
          await visEditor.setInterval('1', { type: 'numeric', append: true });
          expect(await visEditor.getNumericInterval()).toBe('20001');
          expect(await visEditor.isApplyEnabled()).toBe(true);
        });

        await spaceTest.step('allows resetting changed params', async () => {
          await visEditor.clickReset();
          expect(await visEditor.getNumericInterval()).toBe('2000');
        });

        await spaceTest.step('saves and loads the visualization', async () => {
          await visualize.saveVisualization(visName);
          await visualize.loadSavedVisualization(visName);
        });

        await spaceTest.step('has the inspector enabled', async () => {
          expect(await inspector.canBeOpened()).toBe(true);
        });

        await spaceTest.step('shows correct data in the inspector', async () => {
          await inspector.open();
          expect(await inspector.getTableData()).toStrictEqual(testData.BYTES_HISTOGRAM_TABLE);
          await inspector.close();
        });
      }
    );

    spaceTest(
      'shows correct data when using average pipeline aggregation',
      async ({ pageObjects: { visualize, visEditor, visChart } }) => {
        await visualize.createAggBasedVisualization(
          'table',
          testData.DATA_VIEW.LOGSTASH_NON_TIME_BASED
        );
        await visEditor.clickBucket('Metric', 'metrics');
        await visEditor.selectAggregation('Average Bucket', 'metrics');
        await visEditor.selectAggregation('Terms', 'metrics', true);
        await visEditor.selectField('geo.src', 'metrics', true);
        await visEditor.clickGo();

        expect(await visChart.getTableVisContent()).toStrictEqual([['14,004', '1,412.6']]);
      }
    );

    spaceTest(
      'renders and filters a date histogram data table',
      async ({ pageObjects: { visualize, visEditor, visChart, filterBar, renderable } }) => {
        await spaceTest.step('build a date histogram data table', async () => {
          await visualize.createAggBasedVisualization(
            'table',
            testData.DATA_VIEW.LOGSTASH_NON_TIME_BASED
          );
          await visEditor.clickBucket('Split rows');
          await visEditor.selectAggregation('Date Histogram');
          await visEditor.selectField('@timestamp');
          await visEditor.setInterval('Day');
          await visEditor.clickGo();
        });

        await spaceTest.step('shows correct data', async () => {
          expect(await visChart.getTableVisContent()).toStrictEqual([
            ['2015-09-20', '4,757'],
            ['2015-09-21', '4,614'],
            ['2015-09-22', '4,633'],
          ]);
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
