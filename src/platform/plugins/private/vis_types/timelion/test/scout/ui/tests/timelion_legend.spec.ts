/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { registerTimelionSuiteHooks, test } from '../fixtures';

test.describe('Timelion visualization - Legend', { tag: tags.stateful.classic }, () => {
  registerTimelionSuiteHooks(test);

  test('should correctly display the legend items names and position', async ({ pageObjects }) => {
    const { timelion } = pageObjects;
    await timelion.initVisualization('.es(*).label("first series"), .es(*).label("second series")');

    const legendNames = await timelion.getLegendEntries();
    const legendClasses = await timelion.getLegendClasses();

    expect(legendNames).toStrictEqual(['first series', 'second series']);
    expect(legendClasses).toContain('echLegend--top');
    expect(legendClasses).toContain('echLegend--left');
  });

  test('should correctly display the legend position', async ({ pageObjects }) => {
    const { timelion } = pageObjects;
    await timelion.initVisualization('.es(*).legend(position=se)');

    const legendClasses = await timelion.getLegendClasses();

    expect(legendClasses).toContain('echLegend--bottom');
    expect(legendClasses).toContain('echLegend--right');
  });

  test('should not display the legend', async ({ pageObjects }) => {
    const { timelion } = pageObjects;
    await timelion.initVisualization(
      '.es(*), .es(*).label("second series").legend(position=false)'
    );

    const isLegendVisible = await timelion.isLegendVisible();
    expect(isLegendVisible).toBe(false);
  });
});
