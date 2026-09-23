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

const EXAMPLE_TAB = 'doc_view_example';
const UPDATE_ESQL_QUERY_BUTTON = 'exampleDataSourceProfileDocViewUpdateEsqlQuery';
const OPEN_NEW_TAB_BUTTON = 'exampleDataSourceProfileDocViewOpenNewTab';

/** Query the "Update ES|QL query" and "Open new tab" doc viewer actions both apply. */
const UPDATED_ESQL_QUERY = 'FROM my-example-logs | LIMIT 5';

/**
 * The Example doc viewer tab contributed by `example-data-source-profile` exposes toolkit actions
 * that rewrite the ES|QL query or open a named Discover tab. Both reach back out of the flyout into
 * the session, which is what makes them browser tests.
 *
 * The restorable state tab the same accessor registers is covered by
 * get_doc_viewer_restorable_state.spec.ts, which needs a narrower deployment tag.
 */
spaceTest.describe(
  'Discover context awareness - extension getDocViewer, interactions',
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
      'ES|QL mode rewrites the query from the custom doc viewer action',
      async ({ page, pageObjects }) => {
        const { discover, docViewer, unifiedTabs } = pageObjects;

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(
          `from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS} | sort @timestamp desc`
        );

        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        await docViewer.openTab(EXAMPLE_TAB);
        await page.testSubj.click(UPDATE_ESQL_QUERY_BUTTON);
        await discover.waitUntilTabIsLoaded();

        // The query is replaced in place: no new tab, and the current one keeps its name.
        expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled']);
        expect(await unifiedTabs.getSelectedTabLabel()).toBe('Untitled');
        expect(await discover.getEsqlQueryValue()).toBe(UPDATED_ESQL_QUERY);
      }
    );

    spaceTest(
      'ES|QL mode opens a named tab from the custom doc viewer action',
      async ({ page, pageObjects }) => {
        const { discover, docViewer, unifiedTabs } = pageObjects;

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(
          `from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS} | sort @timestamp desc`
        );

        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        await docViewer.openTab(EXAMPLE_TAB);
        await page.testSubj.click(OPEN_NEW_TAB_BUTTON);
        await discover.waitUntilTabIsLoaded();

        expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled', 'My new tab']);
        expect(await unifiedTabs.getSelectedTabLabel()).toBe('My new tab');
        expect(await discover.getEsqlQueryValue()).toBe(UPDATED_ESQL_QUERY);
      }
    );
  }
);
