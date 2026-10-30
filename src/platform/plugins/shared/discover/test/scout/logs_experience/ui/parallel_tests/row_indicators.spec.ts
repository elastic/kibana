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
  LOGS,
  LOGS_EXPERIENCE_TAGS,
  setupLogsExperience,
  teardownLogsExperience,
} from '../fixtures';

spaceTest.describe(
  'Logs profile - Row indicators (getRowIndicatorProvider)',
  {
    tag: LOGS_EXPERIENCE_TAGS,
  },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace, config }) => {
      await setupLogsExperience(scoutSpace, config);
      // A saved data view rather than an ad-hoc one: the surrounding-documents case below needs a
      // data view id it can navigate with.
      await apiServices.dataViews.create({
        title: LOGS.SYNTH_CONTEXT_DATA_VIEW,
        name: LOGS.SYNTH_CONTEXT_DATA_VIEW,
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownLogsExperience(scoutSpace);
    });

    spaceTest(
      'should not render the colour indicator for a logs source without a log.level field',
      async ({ pageObjects }) => {
        const { dataGrid, logsExperience } = pageObjects;

        await logsExperience.gotoEsqlQuery(LOGS.NO_LOG_LEVEL_ESQL_QUERY);

        // The assertion below is an absence, so prove the grid rendered rows first.
        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);
        await expect(logsExperience.colorIndicatorHeader).toBeHidden();
      }
    );

    spaceTest(
      'should not render the colour indicator when the source is not logs',
      async ({ pageObjects }) => {
        const { dataGrid, logsExperience } = pageObjects;

        // These documents do have a `log.level`; the profile simply does not claim the source.
        await logsExperience.gotoEsqlQuery(LOGS.NON_LOGS_FIELDS_ESQL_QUERY);

        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);
        await expect(logsExperience.colorIndicatorHeader).toBeHidden();
      }
    );

    spaceTest('should render log.level row indicators', async ({ pageObjects }) => {
      const { logsExperience } = pageObjects;

      await logsExperience.gotoEsqlQuery(LOGS.SYNTH_CONTEXT_ESQL_QUERY);

      await expect(logsExperience.colorIndicatorHeader).toBeVisible();
      await expect(logsExperience.rowColorIndicator(0)).toHaveAttribute('title', 'Debug');
    });

    spaceTest(
      'should render log.level row indicators on the Surrounding documents page',
      async ({ page, pageObjects }) => {
        const { dataGrid, docViewer, logsExperience } = pageObjects;

        await logsExperience.gotoDataView(LOGS.SYNTH_CONTEXT_DATA_VIEW);

        // Row 0 is the newest document, so the context view shows it as the anchor with the two
        // older documents below it.
        await docViewer.openSurroundingDocuments(0);
        await expect(page).toHaveURL(/#\/context/);
        await dataGrid.waitForDocTableRendered();

        await expect(logsExperience.rowColorIndicator(0)).toHaveAttribute('title', 'Debug');
        await expect(logsExperience.rowColorIndicator(1)).toHaveAttribute('title', 'Error');

        // The context page restores itself from the URL, so a reload re-resolves the profile from
        // scratch rather than inheriting the state Discover left behind.
        await page.reload();
        await dataGrid.waitForDocTableRendered();

        await expect(logsExperience.rowColorIndicator(0)).toHaveAttribute('title', 'Debug');
        await expect(logsExperience.rowColorIndicator(1)).toHaveAttribute('title', 'Error');
      }
    );
  }
);
