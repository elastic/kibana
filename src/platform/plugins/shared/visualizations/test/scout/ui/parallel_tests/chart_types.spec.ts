/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, loadVisualizeSuiteDefaults, cleanupVisualizeSuiteDefaults } from '../fixtures';

spaceTest.describe('Visualize - chart types', { tag: ['@local-stateful-classic'] }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await loadVisualizeSuiteDefaults(scoutSpace);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.visualize.goto();
    await pageObjects.visualize.openNewVisualizationWizard();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await cleanupVisualizeSuiteDefaults(scoutSpace);
  });

  spaceTest(
    'shows the expected visualization types for both recommended and legacy tabs',
    async ({ pageObjects: { visualize } }) => {
      expect(await visualize.getVisibleVisTypes()).toStrictEqual(['Maps', 'Vega', 'Visualization']);

      await visualize.clickLegacyTab();
      expect(await visualize.getVisibleVisTypes()).toStrictEqual(['Aggregation-based', 'TSVB']);
    }
  );

  spaceTest('shows the correct agg-based chart types', async ({ pageObjects: { visualize } }) => {
    await visualize.clickAggBasedVisualizations();

    expect((await visualize.getChartTypes()).sort()).toStrictEqual([
      'Area',
      'Data table',
      'Gauge',
      'Goal',
      'Heat map',
      'Horizontal bar',
      'Line',
      'Metric',
      'Pie',
      'Tag cloud',
      'Timelion',
      'Vertical bar',
    ]);
  });
});
