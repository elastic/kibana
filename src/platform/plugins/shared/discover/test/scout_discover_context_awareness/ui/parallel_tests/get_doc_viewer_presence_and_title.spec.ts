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
  CONTEXT_AWARENESS_DATA_VIEWS,
} from '../fixtures';

const TAB_TABLE = 'docViewerTab-doc_view_table';
const TAB_SOURCE = 'docViewerTab-doc_view_source';
const TAB_EXAMPLE = 'docViewerTab-doc_view_example';
const TAB_RESTORABLE_STATE = 'docViewerTab-doc_view_restorable_state_example';
const ROW_DETAILS_TITLE = 'docViewerRowDetailsTitle';

/**
 * `example-data-source-profile` adds two doc viewer tabs and renames the flyout title, but only for
 * `my-example-logs`. `my-example-*` resolves no data source profile, so it keeps just the built-in
 * Table and JSON tabs and the stock title — "Result" in ES|QL mode, "Document" in data view mode.
 *
 * The non-matching cases are the point as much as the matching ones: they are what would catch a
 * profile widening its match and decorating documents it has no business touching. Both query modes
 * are covered because resolution reads different inputs in each — ES|QL column metadata against a
 * data view's index pattern.
 */
spaceTest.describe(
  'Discover context awareness - extension getDocViewer, tab presence and title',
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
      'ES|QL mode renders only the built-in tabs for a non-matching profile',
      async ({ page, pageObjects }) => {
        const { discover, docViewer } = pageObjects;

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(
          `from ${CONTEXT_AWARENESS_DATA_VIEWS.ALL} | sort @timestamp desc`
        );
        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

        await expect(page.testSubj.locator(TAB_TABLE)).toBeVisible();
        await expect(page.testSubj.locator(TAB_SOURCE)).toBeVisible();
        await expect(page.testSubj.locator(TAB_EXAMPLE)).toBeHidden();
        await expect(page.testSubj.locator(TAB_RESTORABLE_STATE)).toBeHidden();
        await expect(page.testSubj.locator(ROW_DETAILS_TITLE)).toHaveText('Result');
      }
    );

    spaceTest(
      'ES|QL mode renders the custom tabs for a matching profile',
      async ({ page, pageObjects }) => {
        const { discover, docViewer } = pageObjects;

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(
          `from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS} | sort @timestamp desc`
        );
        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

        await expect(page.testSubj.locator(TAB_TABLE)).toBeVisible();
        await expect(page.testSubj.locator(TAB_SOURCE)).toBeVisible();
        await expect(page.testSubj.locator(TAB_EXAMPLE)).toBeVisible();
        await expect(page.testSubj.locator(TAB_RESTORABLE_STATE)).toBeVisible();
        await expect(page.testSubj.locator(ROW_DETAILS_TITLE)).toContainText('Record #1');
      }
    );

    spaceTest(
      'data view mode renders only the built-in tabs for a non-matching profile',
      async ({ page, pageObjects }) => {
        const { discover, docViewer } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.ALL, {
          createAdHocIfMissing: false,
        });
        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

        await expect(page.testSubj.locator(TAB_TABLE)).toBeVisible();
        await expect(page.testSubj.locator(TAB_SOURCE)).toBeVisible();
        await expect(page.testSubj.locator(TAB_EXAMPLE)).toBeHidden();
        await expect(page.testSubj.locator(TAB_RESTORABLE_STATE)).toBeHidden();
        await expect(page.testSubj.locator(ROW_DETAILS_TITLE)).toHaveText('Document');
      }
    );

    spaceTest(
      'data view mode renders the custom tabs for a matching profile',
      async ({ page, pageObjects }) => {
        const { discover, docViewer } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.LOGS, {
          createAdHocIfMissing: false,
        });
        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

        await expect(page.testSubj.locator(TAB_TABLE)).toBeVisible();
        await expect(page.testSubj.locator(TAB_SOURCE)).toBeVisible();
        await expect(page.testSubj.locator(TAB_EXAMPLE)).toBeVisible();
        await expect(page.testSubj.locator(TAB_RESTORABLE_STATE)).toBeVisible();

        // In data view mode the record id is the document's index and `_id`, where ES|QL only has a
        // row number, so this is the one case that pins the full composed title.
        await expect(page.testSubj.locator(ROW_DETAILS_TITLE)).toHaveText(
          'Record #my-example-logs::XdQFDpABfGznVC1bCHLo::'
        );
      }
    );
  }
);
