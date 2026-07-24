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
  'Visualize - embedding a data table',
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
      'opens a data table in embedded mode and supports filtering',
      async ({ page, pageObjects: { visualize, visEditor, visChart, renderable, filterBar } }) => {
        await spaceTest.step('build a data table split by date histogram and bytes', async () => {
          await visualize.createAggBasedVisualization(
            'table',
            testData.DATA_VIEW.LOGSTASH_TIME_BASED
          );
          await visEditor.clickBucket('Split rows');
          await visEditor.selectAggregation('Date Histogram');
          await visEditor.selectField('@timestamp');
          await visEditor.toggleOpenEditor(2, 'false');
          await visEditor.clickBucket('Split rows');
          await visEditor.selectAggregation('Histogram');
          await visEditor.selectField('bytes');
          await visEditor.setInterval('2000', { type: 'numeric', aggNth: 3 });
          await visEditor.clickGo();
        });

        await spaceTest.step('open the table in embedded mode', async () => {
          await page.goto(`${page.url()}&embed=true`);
          await renderable.waitForRender();

          expect(await visChart.getTableVisContent()).toStrictEqual([
            ['2015-09-20 00:00', '0B', '5'],
            ['2015-09-20 00:00', '1.953KB', '5'],
            ['2015-09-20 00:00', '3.906KB', '9'],
            ['2015-09-20 00:00', '5.859KB', '4'],
            ['2015-09-20 00:00', '7.813KB', '14'],
            ['2015-09-20 03:00', '0B', '32'],
            ['2015-09-20 03:00', '1.953KB', '33'],
            ['2015-09-20 03:00', '3.906KB', '45'],
            ['2015-09-20 03:00', '5.859KB', '31'],
            ['2015-09-20 03:00', '7.813KB', '48'],
          ]);
        });

        await spaceTest.step('filter in embedded mode', async () => {
          await filterBar.addFilter({
            field: '@timestamp',
            operator: 'is between',
            value: { from: '2015-09-21', to: '2015-09-23' },
          });
          await renderable.waitForRender();

          expect(await visChart.getTableVisContent()).toStrictEqual([
            ['2015-09-21 00:00', '0B', '7'],
            ['2015-09-21 00:00', '1.953KB', '9'],
            ['2015-09-21 00:00', '3.906KB', '9'],
            ['2015-09-21 00:00', '5.859KB', '6'],
            ['2015-09-21 00:00', '7.813KB', '10'],
            ['2015-09-21 00:00', '11.719KB', '1'],
            ['2015-09-21 03:00', '0B', '28'],
            ['2015-09-21 03:00', '1.953KB', '39'],
            ['2015-09-21 03:00', '3.906KB', '36'],
            ['2015-09-21 03:00', '5.859KB', '43'],
          ]);
        });

        await spaceTest.step('change the timerange by filtering on a table cell', async () => {
          await visChart.filterOnTableCell(0, 6);
          await renderable.waitForRender();

          expect(await visChart.getTableVisContent()).toStrictEqual([
            ['03:00', '0B', '1'],
            ['03:00', '1.953KB', '1'],
            ['03:00', '3.906KB', '1'],
            ['03:00', '5.859KB', '2'],
            ['03:10', '0B', '1'],
            ['03:10', '5.859KB', '1'],
            ['03:10', '7.813KB', '1'],
            ['03:15', '0B', '1'],
            ['03:15', '1.953KB', '1'],
            ['03:20', '1.953KB', '1'],
          ]);
        });
      }
    );
  }
);
