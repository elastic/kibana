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
  'Visualize - data table on an index without a time filter - filters',
  { tag: ['@local-stateful-classic'] },
  () => {
    const visName = 'Visualization DataTable w/o time filter';

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
      'saves, disables the timefilter, and can be filtered from a dashboard',
      async ({
        pageObjects: {
          visualize,
          visEditor,
          visChart,
          dashboard,
          datePicker,
          filterBar,
          renderable,
        },
      }) => {
        await spaceTest.step('build and save a bytes histogram data table', async () => {
          await visualize.createAggBasedVisualization(
            'table',
            testData.DATA_VIEW.LOGSTASH_NON_TIME_BASED
          );
          await visEditor.clickBucket('Split rows');
          await visEditor.selectAggregation('Histogram');
          await visEditor.selectField('bytes');
          await visEditor.setInterval('2000', { type: 'numeric' });
          await visEditor.clickGo();

          await visualize.saveVisualization(visName);
          await visualize.loadSavedVisualization(visName);
        });

        await spaceTest.step('has the timefilter disabled', async () => {
          await expect(datePicker.getDisabledDatePickerIndicator()).toBeAttached();
        });

        await spaceTest.step('can be added to a dashboard and filtered', async () => {
          await dashboard.openNewDashboard();
          await dashboard.addPanelFromLibrary(visName);
          await dashboard.waitForRenderComplete();

          await visChart.filterOnTableCell(0, 1);
          await renderable.waitForRender();

          expect(await filterBar.getFilterCount()).toBe(1);
          await filterBar.removeAllFilters();
        });
      }
    );
  }
);
