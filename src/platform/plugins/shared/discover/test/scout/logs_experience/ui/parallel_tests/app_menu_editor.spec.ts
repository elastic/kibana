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
 * The actions under test open Data Quality, the custom-threshold rule type and the SLO flyout, all
 * of which only exist in an Observability deployment — hence the narrower tag than the rest of the
 * suite.
 */
spaceTest.describe(
  'Logs profile - App menu as an editor (getAppMenu)',
  {
    tag: tags.serverless.observability.complete,
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
      async ({ page, pageObjects }) => {
        await pageObjects.logsExperience.clickAlertsMenuItem('discoverAppMenuCustomThresholdRule');

        await expect(page.testSubj.locator('ruleDefinitionHeaderRuleTypeName')).toHaveText(
          'Custom threshold'
        );
      }
    );

    spaceTest(
      'should open the Create SLO flyout from the Alerts menu',
      async ({ page, pageObjects }) => {
        await pageObjects.logsExperience.clickAlertsMenuItem('discoverAppMenuCreateSlo');

        await expect(page.testSubj.locator('addSLOFlyoutTitle')).toHaveText('Create SLO');
      }
    );
  }
);
