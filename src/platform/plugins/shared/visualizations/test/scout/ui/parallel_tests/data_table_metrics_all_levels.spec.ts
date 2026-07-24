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

const WITHOUT_METRICS_AT_ALL_LEVELS = [
  ['jpg', 'CN', '1,718'],
  ['jpg', 'IN', '1,511'],
  ['jpg', 'US', '770'],
  ['jpg', 'ID', '314'],
  ['jpg', 'PK', '244'],
  ['css', 'CN', '422'],
  ['css', 'IN', '346'],
  ['css', 'US', '189'],
  ['css', 'ID', '68'],
  ['css', 'BR', '58'],
];

spaceTest.describe(
  'Visualize - data table - metrics on all levels',
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
      'renders metrics at the configured levels',
      async ({ pageObjects: { visualize, visEditor, visChart } }) => {
        await spaceTest.step('build a two-level terms table', async () => {
          await visualize.createAggBasedVisualization(
            'table',
            testData.DATA_VIEW.LOGSTASH_TIME_BASED
          );
          await visEditor.clickBucket('Split rows');
          await visEditor.selectAggregation('Terms');
          await visEditor.selectField('extension.raw');
          await visEditor.setSize(2);
          await visEditor.toggleOpenEditor(2, 'false');
          await visEditor.clickBucket('Split rows');
          await visEditor.selectAggregation('Terms');
          await visEditor.selectField('geo.dest');
          await visEditor.toggleOpenEditor(3, 'false');
          await visEditor.clickGo();
        });

        await spaceTest.step('shows correct data without showMetricsAtAllLevels', async () => {
          expect(await visChart.getTableVisContent()).toStrictEqual(WITHOUT_METRICS_AT_ALL_LEVELS);
        });

        await spaceTest.step(
          'shows correct data without showMetricsAtAllLevels even if showPartialRows is selected',
          async () => {
            await visEditor.clickOptionsTab();
            await visEditor.checkSwitch('showPartialRows');
            await visEditor.clickGo();

            expect(await visChart.getTableVisContent()).toStrictEqual(
              WITHOUT_METRICS_AT_ALL_LEVELS
            );
          }
        );

        await spaceTest.step('shows metrics on each level', async () => {
          await visEditor.clickOptionsTab();
          await visEditor.checkSwitch('showMetricsAtAllLevels');
          await visEditor.clickGo();

          expect(await visChart.getTableVisContent()).toStrictEqual([
            ['jpg', '9,109', 'CN', '1,718'],
            ['jpg', '9,109', 'IN', '1,511'],
            ['jpg', '9,109', 'US', '770'],
            ['jpg', '9,109', 'ID', '314'],
            ['jpg', '9,109', 'PK', '244'],
            ['css', '2,159', 'CN', '422'],
            ['css', '2,159', 'IN', '346'],
            ['css', '2,159', 'US', '189'],
            ['css', '2,159', 'ID', '68'],
            ['css', '2,159', 'BR', '58'],
          ]);
        });

        await spaceTest.step('shows metrics other than count on each level', async () => {
          await visEditor.clickDataTab();
          await visEditor.clickBucket('Metric', 'metrics');
          await visEditor.selectAggregation('Average', 'metrics');
          await visEditor.selectField('bytes', 'metrics');
          await visEditor.clickGo();

          expect(await visChart.getTableVisContent()).toStrictEqual([
            ['jpg', '9,109', '5.469KB', 'CN', '1,718', '5.477KB'],
            ['jpg', '9,109', '5.469KB', 'IN', '1,511', '5.456KB'],
            ['jpg', '9,109', '5.469KB', 'US', '770', '5.371KB'],
            ['jpg', '9,109', '5.469KB', 'ID', '314', '5.424KB'],
            ['jpg', '9,109', '5.469KB', 'PK', '244', '5.41KB'],
            ['css', '2,159', '5.566KB', 'CN', '422', '5.712KB'],
            ['css', '2,159', '5.566KB', 'IN', '346', '5.754KB'],
            ['css', '2,159', '5.566KB', 'US', '189', '5.333KB'],
            ['css', '2,159', '5.566KB', 'ID', '68', '4.82KB'],
            ['css', '2,159', '5.566KB', 'BR', '58', '5.915KB'],
          ]);
        });
      }
    );
  }
);
