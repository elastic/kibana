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
  cleanupTsvbSpace,
  openTimeSeriesEditor,
  setupTsvbSpace,
  spaceTest,
  testData,
} from '../fixtures';

spaceTest.describe('TSVB Time Series - data formatters', { tag: testData.DEPLOYMENT_TAGS }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await setupTsvbSpace(scoutSpace);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await openTimeSeriesEditor(pageObjects);
    await pageObjects.visualBuilder.clickSeriesOption();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await cleanupTsvbSpace(scoutSpace);
  });

  spaceTest('formats the legend value with a custom numeric template', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await visualBuilder.changeDataFormatter('number');
    await visualBuilder.enterSeriesTemplate('$ {{value}}');

    await expect.poll(() => visualBuilder.getLegendValue()).toBe('$ 156');
  });

  spaceTest('formats the legend value as a percentage', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await visualBuilder.changeDataFormatter('percent');

    await expect.poll(() => visualBuilder.getLegendValue()).toBe('15,600%');
  });

  spaceTest('formats the legend value as bytes', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await visualBuilder.changeDataFormatter('bytes');

    await expect.poll(() => visualBuilder.getLegendValue()).toBe('156B');
  });

  spaceTest(
    'formats the legend value with the "Human readable" duration formatter',
    async ({ pageObjects }) => {
      const { visualBuilder } = pageObjects;

      await visualBuilder.changeDataFormatter('duration');

      await spaceTest.step('with the default source unit', async () => {
        await visualBuilder.setDurationFormatterSettings({ to: 'Human readable' });
        await expect.poll(() => visualBuilder.getLegendValue()).toBe('a few seconds');
      });

      await spaceTest.step('from seconds', async () => {
        await visualBuilder.setDurationFormatterSettings({ to: 'Human readable', from: 'Seconds' });
        await expect.poll(() => visualBuilder.getLegendValue()).toBe('3 minutes');
      });

      await spaceTest.step('from minutes', async () => {
        await visualBuilder.setDurationFormatterSettings({ to: 'Human readable', from: 'Minutes' });
        await expect.poll(() => visualBuilder.getLegendValue()).toBe('3 hours');
      });
    }
  );
});
