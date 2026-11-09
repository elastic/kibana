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

/** Same deployments as the editor counterpart; see `app_menu_editor.spec.ts`. */
spaceTest.describe(
  'Logs profile - App menu as a viewer (getAppMenu)',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupLogsExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownLogsExperience(scoutSpace);
    });

    spaceTest('should hide the Alerts menu', async ({ pageObjects }) => {
      const { logsExperience } = pageObjects;

      await logsExperience.gotoEsqlQuery(LOGS.SYNTH_CONTEXT_ESQL_QUERY);
      await logsExperience.revealAllAppMenuItems();

      await expect(logsExperience.alertsMenuButton).toHaveCount(0);
    });
  }
);
