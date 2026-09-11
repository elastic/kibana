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

const RESTORABLE_STATE_TAB = 'doc_view_restorable_state_example';
const EXAMPLE_TAB = 'doc_view_example';
const INCREMENT_BUTTON = 'example-restorable-state-doc-view-increment-button';
const COUNT = 'example-restorable-state-doc-view-count';
const UPDATE_ESQL_QUERY_BUTTON = 'exampleDataSourceProfileDocViewUpdateEsqlQuery';
const OPEN_NEW_TAB_BUTTON = 'exampleDataSourceProfileDocViewOpenNewTab';

/** Query the "Update ES|QL query" and "Open new tab" doc viewer actions both apply. */
const UPDATED_ESQL_QUERY = 'FROM my-example-logs | LIMIT 5';

/**
 * The doc viewer tabs contributed by `example-data-source-profile` are interactive: one keeps a
 * counter in restorable state, which has to stay scoped to the Discover tab it was incremented in,
 * and the other exposes toolkit actions that rewrite the ES|QL query or open a new tab. Those
 * actions reach back out of the flyout into the session, which is what makes them browser tests.
 */
spaceTest.describe(
  'Discover context awareness - extension getDocViewer, interactions',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest(
      'ES|QL mode keeps the restorable counter state per Discover tab',
      async ({ page, pageObjects }) => {
        const { discover, docViewer, unifiedTabs } = pageObjects;

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(
          `from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS} | sort @timestamp desc`
        );

        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        await docViewer.openTab(RESTORABLE_STATE_TAB);
        await page.testSubj.click(INCREMENT_BUTTON);
        await page.testSubj.click(INCREMENT_BUTTON);
        await expect(page.testSubj.locator(COUNT)).toHaveText('Count: 2');

        // A second Discover tab gets its own counter, so incrementing here must not leak back.
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        await docViewer.openTab(RESTORABLE_STATE_TAB);
        await page.testSubj.click(INCREMENT_BUTTON);
        await expect(page.testSubj.locator(COUNT)).toHaveText('Count: 1');

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();

        await expect(page.testSubj.locator(COUNT)).toHaveText('Count: 2');
      }
    );

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

    spaceTest(
      'data view mode keeps the restorable counter state per Discover tab',
      async ({ page, pageObjects }) => {
        const { discover, docViewer, unifiedTabs } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.LOGS, {
          createAdHocIfMissing: false,
        });

        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        await docViewer.openTab(RESTORABLE_STATE_TAB);
        await page.testSubj.click(INCREMENT_BUTTON);
        await page.testSubj.click(INCREMENT_BUTTON);
        await expect(page.testSubj.locator(COUNT)).toHaveText('Count: 2');

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        await docViewer.openTab(RESTORABLE_STATE_TAB);
        await page.testSubj.click(INCREMENT_BUTTON);
        await expect(page.testSubj.locator(COUNT)).toHaveText('Count: 1');

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();

        await expect(page.testSubj.locator(COUNT)).toHaveText('Count: 2');
      }
    );
  }
);
