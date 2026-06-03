/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';
import { DISCOVER_LOGSTASH_ALL_ROLE } from '../../fixtures/common/custom_roles';
import {
  closeFieldStatsPopover,
  openFieldStatsPopover,
} from '../../fixtures/common/discover_field_stats';

const ESQL_FIELD_STATS_QUERY =
  'from logstash-* METADATA _index, _id | sort @timestamp desc | limit 500';

spaceTest.describe(
  'Discover sidebar field stats in ESQL mode',
  { tag: testData.DISCOVER_STATEFUL_TAGS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await browserAuth.loginWithCustomRole(DISCOVER_LOGSTASH_ALL_ROLE);
      await pageObjects.discover.setQueryMode('esql');
      await page.gotoApp('discover');
      await page.testSubj.locator('dscPage').waitFor({ state: 'visible', timeout: 60_000 });
      await pageObjects.discover.codeEditor.waitCodeEditorReady('ESQLEditor');
      await pageObjects.discover.codeEditor.setCodeEditorValue(ESQL_FIELD_STATS_QUERY);
      await page.testSubj.locator('querySubmitButton').click();
      await page.testSubj.locator('field-bytes').waitFor({ state: 'visible', timeout: 60_000 });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('does not show stats for a numeric field', async ({ page }) => {
      await openFieldStatsPopover(page, 'bytes');
      await expect(page.testSubj.locator('dscFieldStats-statsFooter')).toBeHidden();
      await closeFieldStatsPopover(page);
    });

    spaceTest('does not show stats for a keyword field', async ({ page }) => {
      await openFieldStatsPopover(page, 'extension.raw');
      await expect(page.testSubj.locator('dscFieldStats-statsFooter')).toBeHidden();
      await closeFieldStatsPopover(page);
    });

    spaceTest(
      'creates an exists filter for the timestamp field without showing stats',
      async ({ page, pageObjects }) => {
        await openFieldStatsPopover(page, '@timestamp');
        await page.testSubj.click('discoverFieldListPanelAddExistFilter-@timestamp');

        await expect
          .poll(async () => (await pageObjects.discover.getEsqlQueryValue()).replace(/\r/g, ''))
          .toBe(`${ESQL_FIELD_STATS_QUERY}\n| WHERE \`@timestamp\` is not null`);
        await expect(page.testSubj.locator('dscFieldStats-statsFooter')).toBeHidden();

        await closeFieldStatsPopover(page);
      }
    );

    spaceTest('does not show examples for a text field', async ({ page }) => {
      await openFieldStatsPopover(page, 'extension');
      await expect(page.testSubj.locator('dscFieldStats-statsFooter')).toBeHidden();
      await closeFieldStatsPopover(page);
    });
  }
);
