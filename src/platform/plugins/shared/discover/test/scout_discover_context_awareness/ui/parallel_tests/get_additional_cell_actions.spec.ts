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
  captureNextDialogMessage,
  openSurroundingDocs,
  CONTEXT_AWARENESS_DATA_VIEWS,
} from '../fixtures';

// Each additional cell action is registered under its declared id plus a generated UUID, so the
// rendered test subject can only be matched by prefix. The actions also appear as hover buttons on
// the cell itself, hence scoping every lookup to the expansion popover.
const ACTION = '[data-test-subj^="dataGridColumnCellAction-example-data-source-action"]';
const ANOTHER_ACTION =
  '[data-test-subj^="dataGridColumnCellAction-another-example-data-source-action"]';
const EXPANSION_POPOVER = 'euiDataGridExpansionPopover';

const ACTION_MESSAGE = 'Example data source action executed';
const ANOTHER_ACTION_MESSAGE = 'Another example data source action executed';

/**
 * `example-data-source-profile` registers two cell actions that raise a native alert when invoked,
 * so the alert text is the only evidence the action actually ran end to end. Both are exercised
 * from the cell expansion popover, on a real column and on a computed ES|QL one, and again on the
 * Surrounding documents page — which resolves its own profile after a full page load.
 *
 * The compatibility rules that decide *which* actions a column offers are covered by
 * context_awareness/hooks/use_additional_cell_actions.test.tsx, so only successful execution is
 * asserted here.
 */
spaceTest.describe(
  'Discover context awareness - extension getAdditionalCellActions',
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
      'ES|QL mode runs the additional cell actions for a logs data source',
      async ({ page, pageObjects }) => {
        const { dataGrid, discover } = pageObjects;

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(
          `from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS} | sort @timestamp desc`
        );

        await dataGrid.expandCell({ rowIndex: 0, columnId: '@timestamp' });
        const actionMessage = captureNextDialogMessage(page);
        await page.testSubj.locator(EXPANSION_POPOVER).locator(ACTION).click();
        expect(await actionMessage).toBe(ACTION_MESSAGE);

        await dataGrid.expandCell({ rowIndex: 0, columnId: '@timestamp' });
        const anotherActionMessage = captureNextDialogMessage(page);
        await page.testSubj.locator(EXPANSION_POPOVER).locator(ANOTHER_ACTION).click();
        expect(await anotherActionMessage).toBe(ANOTHER_ACTION_MESSAGE);
      }
    );

    spaceTest(
      'ES|QL mode runs the additional cell actions for a computed column',
      async ({ page, pageObjects }) => {
        const { dataGrid, discover, unifiedFieldList } = pageObjects;

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(
          `from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS} | sort @timestamp desc | eval foo = "bar"`
        );

        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await unifiedFieldList.clickFieldListItemAdd('foo');

        await dataGrid.expandCell({ rowIndex: 0, columnId: 'foo' });
        const actionMessage = captureNextDialogMessage(page);
        await page.testSubj.locator(EXPANSION_POPOVER).locator(ACTION).click();
        expect(await actionMessage).toBe(ACTION_MESSAGE);
      }
    );

    spaceTest(
      'data view mode runs the additional cell actions in Discover and on surrounding docs',
      async ({ page, pageObjects }) => {
        const { dataGrid, discover } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.LOGS, {
          createAdHocIfMissing: false,
        });
        await discover.waitUntilSearchingHasFinished();

        await dataGrid.expandCell({ rowIndex: 0, columnId: '@timestamp' });
        const actionMessage = captureNextDialogMessage(page);
        await page.testSubj.locator(EXPANSION_POPOVER).locator(ACTION).click();
        expect(await actionMessage).toBe(ACTION_MESSAGE);

        await dataGrid.expandCell({ rowIndex: 0, columnId: '@timestamp' });
        const anotherActionMessage = captureNextDialogMessage(page);
        await page.testSubj.locator(EXPANSION_POPOVER).locator(ANOTHER_ACTION).click();
        expect(await anotherActionMessage).toBe(ANOTHER_ACTION_MESSAGE);

        await openSurroundingDocs(page, dataGrid);

        await dataGrid.expandCell({ rowIndex: 0, columnId: '@timestamp' });
        const contextActionMessage = captureNextDialogMessage(page);
        await page.testSubj.locator(EXPANSION_POPOVER).locator(ACTION).click();
        expect(await contextActionMessage).toBe(ACTION_MESSAGE);

        await dataGrid.expandCell({ rowIndex: 0, columnId: '@timestamp' });
        const contextAnotherActionMessage = captureNextDialogMessage(page);
        await page.testSubj.locator(EXPANSION_POPOVER).locator(ANOTHER_ACTION).click();
        expect(await contextAnotherActionMessage).toBe(ANOTHER_ACTION_MESSAGE);
      }
    );
  }
);
