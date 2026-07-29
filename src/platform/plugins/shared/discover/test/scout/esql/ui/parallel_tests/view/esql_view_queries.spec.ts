/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL query-execution behaviors in Discover: aggregation queries, time
 * ranges with no data, wildcard index patterns that don't map to a saved
 * data view, empty field values, and queries without a `FROM` source.
 */

import { NULL_LABEL } from '@kbn/field-formats-common';
import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import type { PageObjects } from '@kbn/scout';
import { spaceTest, testData } from '../../fixtures';

const AGG_QUERY =
  'from logstash-* | sort @timestamp | limit 10 | stats countB = count(bytes) by geo.dest | sort countB';

/**
 * Submits an ES|QL aggregation query and opts out of the default "cascade
 * layout" grouping, so the result can be read as a flat grid.
 */
const submitAggQueryAsFlatGrid = async (discover: PageObjects['discover'], query: string) => {
  await discover.codeEditor.setCodeEditorValue(query);
  await discover.submitQuery();
  await discover.waitUntilTabIsLoaded();
  await discover.optOutOfCascadeGrouping();
};

spaceTest.describe('Discover ES|QL view - queries', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.use({ viewport: { width: 1600, height: 1200 } });

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('renders a chart and grid for an aggregation query', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;

    await discover.codeEditor.setCodeEditorValue(AGG_QUERY);
    await discover.submitQuery();
    await discover.waitUntilTabIsLoaded();

    // Lens suggests an XY chart for this aggregation shape.
    await expect(page.testSubj.locator('unifiedHistogramChart')).toBeVisible();
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

    // This result shape is grouped by default ("cascade layout"); opt out to
    // read it as a flat grid.
    await discover.optOutOfCascadeGrouping();
    const rows = await discover.getDataGridRows();
    expect(rows[0][0]).toBe('1');
  });

  spaceTest(
    'shows no-results then restores data when returning to the default time range',
    async ({ page, pageObjects }) => {
      const { discover, datePicker } = pageObjects;

      await submitAggQueryAsFlatGrid(discover, AGG_QUERY);
      let rows = await discover.getDataGridRows();
      expect(rows[0][0]).toBe('1');

      await datePicker.setAbsoluteRange({
        from: 'Sep 19, 2015 @ 06:31:44.000',
        to: 'Sep 19, 2015 @ 06:31:44.000',
      });
      await discover.waitUntilTabIsLoaded();
      await expect(page.testSubj.locator('discoverNoResults')).toBeVisible();

      await datePicker.setAbsoluteRange(testData.DEFAULT_TIME_RANGE_DISPLAY);
      await discover.waitUntilTabIsLoaded();
      await discover.optOutOfCascadeGrouping();
      rows = await discover.getDataGridRows();
      expect(rows[0][0]).toBe('1');
    }
  );

  spaceTest(
    'queries a wildcard index pattern that has no matching data view',
    async ({ pageObjects }) => {
      const { discover } = pageObjects;

      await submitAggQueryAsFlatGrid(
        discover,
        'from logstash* | sort @timestamp | limit 10 | stats countB = count(bytes) by geo.dest | sort countB'
      );
      const rows = await discover.getDataGridRows();
      expect(rows[0][0]).toBe('1');
    }
  );

  spaceTest('formats empty field values with the null placeholder', async ({ pageObjects }) => {
    const { discover } = pageObjects;

    await discover.codeEditor.setCodeEditorValue(
      'from logstash-* | limit 10 | keep machine.ram_range, bytes'
    );
    await discover.submitQuery();
    await discover.waitUntilTabIsLoaded();

    const rows = await discover.getDataGridRows();
    expect(rows[0][1]).toBe(NULL_LABEL);
    expect(await discover.getDocHeader()).toStrictEqual(['bytes', 'machine.ram_range']);
  });

  spaceTest('renders a query with no FROM source', async ({ pageObjects }) => {
    const { discover } = pageObjects;

    await discover.codeEditor.setCodeEditorValue('ROW a = 1, b = "two", c = null');
    await discover.submitQuery();
    await discover.waitUntilTabIsLoaded();

    await discover.dragFieldToGrid(['a']);
    const rows = await discover.getDataGridRows();
    expect(rows[0][0]).toBe('1');
  });
});
