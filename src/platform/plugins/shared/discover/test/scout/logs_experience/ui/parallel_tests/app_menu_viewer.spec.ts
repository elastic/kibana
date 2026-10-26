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

/** Same Observability-only scope as the editor counterpart; see `app_menu_editor.spec.ts`. */
spaceTest.describe(
  'Logs profile - App menu as a viewer (getAppMenu)',
  {
    tag: tags.serverless.observability.complete,
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

    spaceTest('should hide the Alerts menu', async ({ page, pageObjects }) => {
      const { appMenu, logsExperience } = pageObjects;

      await logsExperience.gotoEsqlQuery(LOGS.SYNTH_CONTEXT_ESQL_QUERY);

      // Reveal a menu item a viewer does have, so the menu is known to have finished rendering, and
      // open the overflow when there is one: collapsed items are not mounted until it opens.
      await appMenu.revealItem('discoverNewButton');
      if (await appMenu.overflowButton.isVisible()) {
        await appMenu.openOverflow();
      }

      await expect(page.testSubj.locator('discoverAlertsButton')).toHaveCount(0);
    });
  }
);
