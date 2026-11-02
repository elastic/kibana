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
  openSurroundingDocs,
  CONTEXT_AWARENESS_DATA_VIEWS,
} from '../fixtures';

const LOGS_CONTROL = 'exampleLogsControl_chartBarVerticalStack';
const ACTIONS_MENU_CONTROL = 'unifiedDataTable_additionalRowControl_actionsMenu';

/**
 * `example-data-source-profile` contributes two leading controls to every row, but only for a logs
 * data source — `my-example-metrics` must render neither. In data view mode the controls are also
 * checked on the Surrounding documents page, which resolves its own profile from the URL, so the
 * contribution has to survive leaving Discover entirely.
 */
spaceTest.describe(
  'Discover context awareness - extension getRowAdditionalLeadingControls',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest(
      'ES|QL mode renders the logs controls for a logs data source',
      async ({ pageObjects }) => {
        const { dataGrid, discover } = pageObjects;

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(
          `from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS} | sort @timestamp desc`
        );

        await expect(dataGrid.getRowLeadingControl(0, LOGS_CONTROL)).toBeVisible();
        await expect(dataGrid.getRowLeadingControl(0, ACTIONS_MENU_CONTROL)).toBeVisible();
      }
    );

    spaceTest(
      'ES|QL mode does not render the logs controls for a non-logs data source',
      async ({ pageObjects }) => {
        const { dataGrid, discover } = pageObjects;

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(
          `from ${CONTEXT_AWARENESS_DATA_VIEWS.METRICS} | sort @timestamp desc`
        );

        await expect(dataGrid.getRowLeadingControl(0, LOGS_CONTROL)).toBeHidden();
        await expect(dataGrid.getRowLeadingControl(0, ACTIONS_MENU_CONTROL)).toBeHidden();
      }
    );

    spaceTest(
      'data view mode renders the logs controls for a logs data source, including surrounding docs',
      async ({ page, pageObjects }) => {
        const { dataGrid, discover } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.LOGS, {
          createAdHocIfMissing: false,
        });
        await discover.waitUntilSearchingHasFinished();

        await expect(dataGrid.getRowLeadingControl(0, LOGS_CONTROL)).toBeVisible();
        await expect(dataGrid.getRowLeadingControl(0, ACTIONS_MENU_CONTROL)).toBeVisible();

        await openSurroundingDocs(page, dataGrid);

        await expect(dataGrid.getRowLeadingControl(0, LOGS_CONTROL)).toBeVisible();
        await expect(dataGrid.getRowLeadingControl(0, ACTIONS_MENU_CONTROL)).toBeVisible();
      }
    );

    spaceTest(
      'data view mode does not render the logs controls for a non-logs data source, including surrounding docs',
      async ({ page, pageObjects }) => {
        const { dataGrid, discover } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.METRICS, {
          createAdHocIfMissing: false,
        });
        await discover.waitUntilSearchingHasFinished();

        await expect(dataGrid.getRowLeadingControl(0, LOGS_CONTROL)).toBeHidden();
        await expect(dataGrid.getRowLeadingControl(0, ACTIONS_MENU_CONTROL)).toBeHidden();

        await openSurroundingDocs(page, dataGrid);

        await expect(dataGrid.getRowLeadingControl(0, LOGS_CONTROL)).toBeHidden();
        await expect(dataGrid.getRowLeadingControl(0, ACTIONS_MENU_CONTROL)).toBeHidden();
      }
    );
  }
);
