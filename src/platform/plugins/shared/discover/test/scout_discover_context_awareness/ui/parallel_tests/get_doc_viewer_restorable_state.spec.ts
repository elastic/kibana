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
const INCREMENT_BUTTON = 'example-restorable-state-doc-view-increment-button';
const COUNT = 'example-restorable-state-doc-view-count';

/**
 * The counter the restorable state doc viewer keeps is scoped to the Discover tab it was
 * incremented in, and it survives leaving that tab and coming back — but only while the flyout
 * stays open, which is what the doc view itself tells the user. So the tab has to be switched with
 * the flyout still up, and that is the whole shape of these tests.
 *
 * Classic navigation only. The doc viewer flyout draws an `ownFocus` overlay mask, and on a
 * solution view deployment the Discover tabs bar sits inside the masked region: the "New tab"
 * button resolves and reports visible, but the mask swallows the click, so switching tabs with the
 * flyout open is not possible there.
 */
spaceTest.describe(
  'Discover context awareness - extension getDocViewer, restorable state',
  { tag: tags.stateful.classic },
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
        await discover.createNewTabAndSearch();
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

        await discover.createNewTabAndSearch();
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
