/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL histogram visibility rules (hidden for indices without an
 * `@timestamp`-like field, unless `?_tstart`/`?_tend` params are used) and
 * time-range brushing.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { spaceTest } from '../../fixtures';

spaceTest.describe('Discover ES|QL view - histogram', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults({ loadFlightsDataView: true });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'hides the histogram for indices without a time field',
    async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.codeEditor.setCodeEditorValue('from kibana_sample_data_flights | limit 10');
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();

      await expect(page.testSubj.locator('ESQLEditor')).toBeVisible();
      await expect(page.testSubj.locator('unifiedHistogramChart')).toBeHidden();
    }
  );

  spaceTest(
    'shows the histogram when ?_tstart/?_tend params are used, even without a time field',
    async ({ page, pageObjects }) => {
      const { discover, datePicker } = pageObjects;

      await discover.codeEditor.setCodeEditorValue(
        'from kibana_sample_data_flights | limit 10 | where timestamp >= ?_tstart and timestamp <= ?_tend'
      );
      await discover.submitQuery();
      await datePicker.setAbsoluteRange({
        from: 'Apr 10, 2018 @ 00:00:00.000',
        to: 'Nov 15, 2018 @ 00:00:00.000',
      });
      await discover.waitUntilTabIsLoaded();

      await expect(page.testSubj.locator('ESQLEditor')).toBeVisible();
      await expect(page.testSubj.locator('unifiedHistogramChart')).toBeVisible();
    }
  );

  spaceTest(
    'brushing the histogram updates the time range without adding a filter',
    async ({ pageObjects }) => {
      const { discover, datePicker, filterBar } = pageObjects;

      // The time range comes from `timepicker:timeDefaults` (set by
      // `setupDiscoverDefaults`), so there's no need to drive the picker UI
      // here — it is disabled anyway until a query targeting an index with a
      // time field has been executed.
      await discover.codeEditor.setCodeEditorValue('from logstash-* | limit 100');
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();

      const initialTimeConfig = await datePicker.getTimeConfig();
      await discover.brushHistogram();
      await discover.waitUntilTabIsLoaded();

      // no filter pill is created for a time brush
      expect(await filterBar.getFilterCount()).toBe(0);

      const updatedTimeConfig = await datePicker.getTimeConfig();
      expect(updatedTimeConfig).not.toStrictEqual(initialTimeConfig);

      const parseDate = (s: string) => new Date(s.replace(' @ ', ' ')).getTime();
      const brushedHours =
        (parseDate(updatedTimeConfig.end) - parseDate(updatedTimeConfig.start)) / (1000 * 60 * 60);
      expect(brushedHours).toBeGreaterThan(5);
      expect(brushedHours).toBeLessThan(40);
    }
  );
});
