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
import { spaceTest, LOGS, setupLogsExperience, teardownLogsExperience } from '../fixtures';

/**
 * The actions under test are contributed by the Observability root profile, which stateful spaces
 * get through the `oblt` solution view set in setup. Logs Essentials projects have no SLOs.
 */
spaceTest.describe(
  'Logs profile - App menu as an editor (getAppMenu)',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupLogsExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      // `loginAs` rather than a named helper: Scout exposes viewer, admin and privileged-user
      // shortcuts, and the FTR case this replaces ran specifically as the serverless editor.
      await browserAuth.loginAs('editor');
      await pageObjects.logsExperience.gotoEsqlQuery(LOGS.SYNTH_CONTEXT_ESQL_QUERY);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownLogsExperience(scoutSpace);
    });

    spaceTest(
      'should display a Data Quality link that navigates to the Data Quality page',
      async ({ page, pageObjects }) => {
        await pageObjects.discover.clickAppMenuItem('discoverAppMenuDatasetQualityLink');

        await expect(page).toHaveURL(/\/app\/management\/data\/data_quality/);
      }
    );

    spaceTest(
      'should open the custom threshold rule form from the Alerts menu',
      async ({ pageObjects }) => {
        const { logsExperience } = pageObjects;

        await logsExperience.clickAlertsMenuItem('discoverAppMenuCustomThresholdRule');

        await expect(logsExperience.ruleTypeName).toHaveText('Custom threshold');
      }
    );

    spaceTest('should open the Create SLO flyout from the Alerts menu', async ({ pageObjects }) => {
      const { logsExperience } = pageObjects;

      await logsExperience.clickAlertsMenuItem('discoverAppMenuCreateSlo');

      await expect(logsExperience.createSloFlyoutTitle).toHaveText('Create SLO');
    });
  }
);
