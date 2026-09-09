/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags, DEFAULT_TIME_RANGE_DISPLAY } from '../fixtures';

const STATS_QUERY =
  'from logstash-* | sort @timestamp | limit 10 | stats countB = count(bytes) by geo.dest | sort countB';

spaceTest.describe(
  'Discover ES|QL view chrome and rendering',
  { tag: tags.deploymentAgnostic },
  () => {
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

    spaceTest('renders ES|QL-specific chrome', async ({ page, pageObjects }) => {
      const { unifiedFieldList } = pageObjects;
      await unifiedFieldList.waitUntilSidebarHasLoaded();

      await expect(page.testSubj.locator('ESQLEditor')).toBeVisible();
      await expect(page.testSubj.locator('discoverQueryHits')).toBeVisible();
      await expect(page.testSubj.locator('unifiedHistogramChart')).toBeVisible();
      // classic-only controls are hidden
      await expect(page.testSubj.locator('showQueryBarMenu')).toBeHidden();
      await expect(page.testSubj.locator('addFilter')).toBeHidden();
      await expect(page.testSubj.locator('dscViewModeToggleButton')).toBeHidden();
      // no column sort button in ES|QL document view
      await expect(page.testSubj.locator('dataGridColumnSortingButton')).toBeHidden();
      // expand toggle still present (rendered once per row, so scope to the first row)
      await expect(
        page.locator(
          '[data-grid-visible-row-index="0"] [data-test-subj="docTableExpandToggleColumn"]'
        )
      ).toBeVisible();
      // field stats don't show an edit link (no underlying data-view field to edit)
      await page.testSubj.click('field-@message-showDetails');
      await expect(page.testSubj.locator('discoverFieldListPanelEditItem')).toBeHidden();
    });

    spaceTest(
      'hides histogram for index without a timestamp field; shows it when ?_tstart/?_tend params are used',
      async ({ page, pageObjects }) => {
        const { discover, datePicker } = pageObjects;

        // Set the time range while the picker is still enabled (logstash-* is the active query).
        await datePicker.setAbsoluteRange({
          from: 'Apr 10, 2018 @ 00:00:00.000',
          to: 'Nov 15, 2018 @ 00:00:00.000',
        });

        // With ?_tstart/?_tend the histogram appears even though kibana_sample_data_flights
        // has no @timestamp field — Discover maps the time-picker range to those params.
        await discover.writeAndSubmitEsqlQuery(
          'from kibana_sample_data_flights | limit 10 | where timestamp >= ?_tstart and timestamp <= ?_tend'
        );
        await expect(page.testSubj.locator('unifiedHistogramChart')).toBeVisible();

        // Without the params the histogram is hidden, even for the same index.
        // (Picker is now disabled, but we only read — no click needed.)
        await discover.writeAndSubmitEsqlQuery('from kibana_sample_data_flights | limit 10');
        await expect(page.testSubj.locator('unifiedHistogramChart')).toBeHidden();
      }
    );

    spaceTest(
      'executes STATS query and renders XY chart with correct results',
      async ({ page, pageObjects }) => {
        const { discover, dataGrid } = pageObjects;

        await discover.writeAndSubmitEsqlQuery(STATS_QUERY);
        await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

        // A `STATS ... BY` query lands in the cascade layout; drop back to the flat
        // doc table so the raw result cells can be asserted.
        await discover.optOutOfCascadeLayout();
        await dataGrid.waitForDocTableRendered();
        await expect(dataGrid.getCellValue(0, 'countB')).toHaveText('1');

        // An index glob that doesn't resolve to a named data view should work the same way.
        await discover.writeAndSubmitEsqlQuery(
          STATS_QUERY.replace('from logstash-*', 'from logstash*')
        );
        await dataGrid.waitForDocTableRendered();
        await expect(dataGrid.getCellValue(0, 'countB')).toHaveText('1');
      }
    );

    spaceTest(
      'shows no-results callout when time range has no data, then recovers',
      async ({ page, pageObjects }) => {
        const { discover, datePicker, dataGrid } = pageObjects;

        await discover.writeAndSubmitEsqlQuery(STATS_QUERY);
        // Leave the cascade layout that `STATS ... BY` triggers so result cells are assertable.
        await discover.optOutOfCascadeLayout();
        await dataGrid.waitForDocTableRendered();
        await expect(dataGrid.getCellValue(0, 'countB')).toHaveText('1');

        // Collapse the time range to a single instant → no documents.
        await datePicker.setAbsoluteRange({
          from: 'Sep 19, 2015 @ 06:31:44.000',
          to: 'Sep 19, 2015 @ 06:31:44.000',
        });
        await expect(page.testSubj.locator('discoverNoResults')).toBeVisible();

        // Restore the default time range → data returns.
        await datePicker.setAbsoluteRange(DEFAULT_TIME_RANGE_DISPLAY);
        await dataGrid.waitForDocTableRendered();
        await expect(dataGrid.getCellValue(0, 'countB')).toHaveText('1');
      }
    );
  }
);
