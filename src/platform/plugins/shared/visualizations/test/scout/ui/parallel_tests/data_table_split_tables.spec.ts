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
  'Visualize - data table - split tables',
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
      'splits a table into multiple tables',
      async ({ pageObjects: { visualize, visEditor, visChart } }) => {
        await spaceTest.step('build a split table', async () => {
          await visualize.createAggBasedVisualization(
            'table',
            testData.DATA_VIEW.LOGSTASH_TIME_BASED
          );
          await visEditor.clickBucket('Split table');
          // split by column to make all tables rows visible
          await visEditor.clickSplitDirection('Columns');
          await visEditor.selectAggregation('Terms');
          await visEditor.selectField('extension.raw');
          await visEditor.setSize(2);
          await visEditor.toggleOpenEditor(2, 'false');
          await visEditor.clickBucket('Split rows');
          await visEditor.selectAggregation('Terms');
          await visEditor.selectField('geo.dest');
          await visEditor.setSize(3, 3);
          await visEditor.toggleOpenEditor(3, 'false');
          await visEditor.clickBucket('Split rows');
          await visEditor.selectAggregation('Terms');
          await visEditor.selectField('geo.src');
          await visEditor.setSize(3, 4);
          await visEditor.toggleOpenEditor(4, 'false');
          await visEditor.clickGo();
        });

        await spaceTest.step('has a split table', async () => {
          expect(await visChart.getTableVisContent()).toStrictEqual([
            [
              ['CN', 'CN', '330'],
              ['CN', 'IN', '274'],
              ['CN', 'US', '140'],
              ['IN', 'CN', '286'],
              ['IN', 'IN', '281'],
              ['IN', 'US', '133'],
              ['US', 'CN', '135'],
              ['US', 'IN', '134'],
              ['US', 'US', '52'],
            ],
            [
              ['CN', 'CN', '90'],
              ['CN', 'IN', '84'],
              ['CN', 'US', '27'],
              ['IN', 'CN', '69'],
              ['IN', 'IN', '58'],
              ['IN', 'US', '34'],
              ['US', 'IN', '36'],
              ['US', 'CN', '29'],
              ['US', 'US', '13'],
            ],
          ]);
        });

        await spaceTest.step(
          'shows metrics for the split bucket when using showMetricsAtAllLevels',
          async () => {
            await visEditor.clickOptionsTab();
            await visEditor.checkSwitch('showMetricsAtAllLevels');
            await visEditor.clickGo();

            expect(await visChart.getTableVisContent()).toStrictEqual([
              [
                ['CN', '1,718', 'CN', '330'],
                ['CN', '1,718', 'IN', '274'],
                ['CN', '1,718', 'US', '140'],
                ['IN', '1,511', 'CN', '286'],
                ['IN', '1,511', 'IN', '281'],
                ['IN', '1,511', 'US', '133'],
                ['US', '770', 'CN', '135'],
                ['US', '770', 'IN', '134'],
                ['US', '770', 'US', '52'],
              ],
              [
                ['CN', '422', 'CN', '90'],
                ['CN', '422', 'IN', '84'],
                ['CN', '422', 'US', '27'],
                ['IN', '346', 'CN', '69'],
                ['IN', '346', 'IN', '58'],
                ['IN', '346', 'US', '34'],
                ['US', '189', 'IN', '36'],
                ['US', '189', 'CN', '29'],
                ['US', '189', 'US', '13'],
              ],
            ]);
          }
        );
      }
    );
  }
);
