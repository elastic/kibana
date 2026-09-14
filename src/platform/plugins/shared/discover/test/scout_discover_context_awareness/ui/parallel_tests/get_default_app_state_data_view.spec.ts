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
import {
  spaceTest,
  setupContextAwareness,
  teardownContextAwareness,
  AUTO_ROW_HEIGHT,
  BREAKDOWN_FIELD,
  BREAKDOWN_SELECTOR,
  CONTEXT_AWARENESS_DATA_VIEWS,
  DEFAULT_PROFILE_COLUMNS,
  DEFAULT_PROFILE_ROW_HEIGHT,
  getGridColumnIds,
  LOGS_PROFILE_COLUMNS,
  LOGS_PROFILE_ROW_HEIGHT,
  readRowHeight,
  setRowHeight,
} from '../fixtures';

/**
 * Same default state as the ES|QL cases, but resolved from the selected data view: `my-example-logs`
 * picks up the columns, custom row height and histogram breakdown from
 * `example-data-source-profile`, while `my-example-*` resolves no data source defaults and falls
 * back to the summary column with a row height of 3.
 */
spaceTest.describe(
  'Discover context awareness - extension getDefaultAppState, data view mode',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.goto({ queryMode: 'classic' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest('renders the profile default state', async ({ page, pageObjects }) => {
      const { dataGrid, discover } = pageObjects;

      await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.LOGS, {
        createAdHocIfMissing: false,
      });

      await expect.poll(() => getGridColumnIds(page)).toStrictEqual(LOGS_PROFILE_COLUMNS);

      expect(await readRowHeight(page, dataGrid)).toStrictEqual(LOGS_PROFILE_ROW_HEIGHT);

      await expect(page.testSubj.locator(BREAKDOWN_SELECTOR)).toHaveAttribute(
        'data-selected-value',
        BREAKDOWN_FIELD
      );
    });

    spaceTest(
      'reapplies the default state when switching data views',
      async ({ page, pageObjects }) => {
        const { dataGrid, discover } = pageObjects;

        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.ALL, {
          createAdHocIfMissing: false,
        });

        await expect.poll(() => getGridColumnIds(page)).toStrictEqual(DEFAULT_PROFILE_COLUMNS);

        expect(await readRowHeight(page, dataGrid)).toStrictEqual(DEFAULT_PROFILE_ROW_HEIGHT);

        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.LOGS, {
          createAdHocIfMissing: false,
        });

        await expect.poll(() => getGridColumnIds(page)).toStrictEqual(LOGS_PROFILE_COLUMNS);

        expect(await readRowHeight(page, dataGrid)).toStrictEqual(LOGS_PROFILE_ROW_HEIGHT);

        await expect(page.testSubj.locator(BREAKDOWN_SELECTOR)).toHaveAttribute(
          'data-selected-value',
          BREAKDOWN_FIELD
        );
      }
    );

    spaceTest('restores the default state when clicking New', async ({ page, pageObjects }) => {
      const { dataGrid, discover, unifiedFieldList } = pageObjects;

      await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.LOGS, {
        createAdHocIfMissing: false,
      });
      await expect.poll(() => getGridColumnIds(page)).toStrictEqual(LOGS_PROFILE_COLUMNS);

      await unifiedFieldList.clickFieldListItemRemove('log.level');
      await unifiedFieldList.clickFieldListItemRemove('message');
      await expect.poll(() => getGridColumnIds(page)).toStrictEqual(DEFAULT_PROFILE_COLUMNS);

      await setRowHeight(page, dataGrid, 'Auto');
      expect(await readRowHeight(page, dataGrid)).toStrictEqual(AUTO_ROW_HEIGHT);

      await discover.clickNewSearch();

      await expect.poll(() => getGridColumnIds(page)).toStrictEqual(LOGS_PROFILE_COLUMNS);

      expect(await readRowHeight(page, dataGrid)).toStrictEqual(LOGS_PROFILE_ROW_HEIGHT);

      await expect(page.testSubj.locator(BREAKDOWN_SELECTOR)).toHaveAttribute(
        'data-selected-value',
        BREAKDOWN_FIELD
      );
    });
  }
);
