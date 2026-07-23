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

const DATE_HISTOGRAM_DAY_DATA = [
  ['2015-09-20', '4,757'],
  ['2015-09-21', '4,614'],
  ['2015-09-22', '4,633'],
];

spaceTest.describe(
  'Visualize - data table - aggregations',
  { tag: ['@local-stateful-classic'] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await loadVisualizeSuiteDefaults(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects: { visualize } }) => {
      await browserAuth.loginAsPrivilegedUser();
      await visualize.createAggBasedVisualization('table', testData.DATA_VIEW.LOGSTASH_TIME_BASED);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await cleanupVisualizeSuiteDefaults(scoutSpace);
    });

    spaceTest(
      'shows percentage columns',
      async ({ pageObjects: { visualize, visEditor, visChart } }) => {
        const expectedPercentageData = [
          ['≥ 0B and < 1,000B', '1,351', '64.703%'],
          ['≥ 1,000B and < 1.953KB', '737', '35.297%'],
        ];

        await spaceTest.step('build a range table with a percentage column', async () => {
          await visEditor.clickBucket('Split rows');
          await visEditor.selectAggregation('Range');
          await visEditor.selectField('bytes');
          await visEditor.clickGo();
          await visEditor.clickOptionsTab();
          await visEditor.setSelectByOptionText('datatableVisualizationPercentageCol', 'Count');
          await visEditor.clickGo();
          expect(await visChart.getTableVisContent()).toStrictEqual(expectedPercentageData);
        });

        await spaceTest.step('keeps the percentage column after save and reload', async () => {
          const saveName = 'vis w/ percents';
          await visualize.saveVisualization(saveName);
          await visualize.loadSavedVisualization(saveName);
          expect(await visChart.getTableVisContent()).toStrictEqual(expectedPercentageData);
        });

        await spaceTest.step('works after removing the column it referenced', async () => {
          await visEditor.clickDataTab();
          await visEditor.clickBucket('Metric', 'metrics');
          await visEditor.selectAggregation('Average', 'metrics');
          await visEditor.selectField('bytes', 'metrics');
          await visEditor.removeDimension(1);
          await visEditor.clickGo();
          await visEditor.clickOptionsTab();

          expect(await visChart.getTableVisContent()).toStrictEqual([
            ['≥ 0B and < 1,000B', '344.094B'],
            ['≥ 1,000B and < 1.953KB', '1.697KB'],
          ]);
        });
      }
    );

    spaceTest(
      'shows correct data when using average pipeline aggregation',
      async ({ pageObjects: { visEditor, visChart } }) => {
        await visEditor.clickBucket('Metric', 'metrics');
        await visEditor.selectAggregation('Average Bucket', 'metrics');
        await visEditor.selectAggregation('Terms', 'metrics', true);
        await visEditor.selectField('geo.src', 'metrics', true);
        await visEditor.clickGo();

        expect(await visChart.getTableVisContent()).toStrictEqual([['14,004', '1,412.6']]);
      }
    );

    spaceTest(
      'shows correct data for a data table with date histogram',
      async ({ pageObjects: { visEditor, visChart } }) => {
        await visEditor.clickBucket('Split rows');
        await visEditor.selectAggregation('Date Histogram');
        await visEditor.selectField('@timestamp');
        await visEditor.setInterval('Day');
        await visEditor.clickGo();

        expect(await visChart.getTableVisContent()).toStrictEqual(DATE_HISTOGRAM_DAY_DATA);
      }
    );

    spaceTest(
      'shows correct data when selecting a field by its custom name',
      async ({ pageObjects: { visEditor, visChart } }) => {
        await visEditor.clickBucket('Split rows');
        await visEditor.selectAggregation('Date Histogram');
        await visEditor.selectField('UTC time');
        await visEditor.setInterval('Day');
        await visEditor.clickGo();

        expect(await visChart.getTableVisContent()).toStrictEqual(DATE_HISTOGRAM_DAY_DATA);
        expect(await visChart.getTableVisHeader()).toContain('UTC time');
      }
    );

    spaceTest(
      'shows correct data for a data table with top hits',
      async ({ pageObjects: { visEditor, visChart } }) => {
        await visEditor.clickMetricEditor();
        await visEditor.selectAggregation('Top Hit', 'metrics');
        await visEditor.selectField('agent.raw', 'metrics');
        await visEditor.clickGo();

        const data = await visChart.getTableVisContent();
        expect(data.length).toBeGreaterThan(0);
      }
    );

    spaceTest(
      'shows correct data for a data table with range agg',
      async ({ pageObjects: { visEditor, visChart } }) => {
        await visEditor.clickBucket('Split rows');
        await visEditor.selectAggregation('Range');
        await visEditor.selectField('bytes');
        await visEditor.clickGo();

        expect(await visChart.getTableVisContent()).toStrictEqual([
          ['≥ 0B and < 1,000B', '1,351'],
          ['≥ 1,000B and < 1.953KB', '737'],
        ]);
      }
    );
  }
);
