/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  setupContextAwareness,
  teardownContextAwareness,
  AUTO_ROW_HEIGHT,
  CLASSIC_NAV_DEPLOYMENTS,
  CONTEXT_AWARENESS_DATA_VIEWS,
  getProfileUrlState,
  getStoredTabs,
  openProfileStateDocView,
  LOGS_PROFILE_ROW_HEIGHT,
  readRowHeight,
  setRowHeight,
} from '../fixtures';

const TIMESTAMP_COLOR_SELECT = 'exampleProfileStateTimestampColorSelect';
const ROW_CONTROL_COLOR_SELECT = 'exampleProfileStateRowControlColorSelect';
const BOX_COLOR_SELECT = 'exampleProfileStateBoxColorSelect';

/**
 * A profile can park state in three places, each with different lifetime rules: UI state lives only
 * as long as the tab, persistent state is written to `discover.tabs` in localStorage, and URL state
 * rides in the `_p` hash parameter. The distinction only shows up through real navigation — going
 * back, reloading, restoring a closed tab, duplicating one — so it cannot be unit tested; the state
 * containers themselves already are, in in_memory_toolkit.test.ts and profile_state_adapter.test.ts.
 *
 * Classic navigation only: the timestamp whose colour is asserted is rendered by
 * `example-root-profile`, which stops resolving once a solution view is active.
 */
spaceTest.describe(
  'Discover context awareness - profile state, ES|QL mode',
  { tag: CLASSIC_NAV_DEPLOYMENTS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.writeAndSubmitEsqlQuery(
        `from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS}`
      );
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest(
      'applies the default profile state on first resolve and keeps it isolated per tab',
      async ({ page, pageObjects }) => {
        const { dataGrid, discover, unifiedTabs } = pageObjects;

        expect(await readRowHeight(page, dataGrid)).toStrictEqual(LOGS_PROFILE_ROW_HEIGHT);

        await setRowHeight(page, dataGrid, 'Auto');
        expect(await readRowHeight(page, dataGrid)).toStrictEqual(AUTO_ROW_HEIGHT);

        // A fresh tab resolves the profile from scratch, so it starts from the default again.
        await discover.createNewTabAndSearch();
        expect(await readRowHeight(page, dataGrid)).toStrictEqual(LOGS_PROFILE_ROW_HEIGHT);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        expect(await readRowHeight(page, dataGrid)).toStrictEqual(AUTO_ROW_HEIGHT);
      }
    );

    spaceTest(
      'restores isolated profile state and carries it into profiles without defaults',
      async ({ page, pageObjects }) => {
        const { dataGrid, discover } = pageObjects;

        expect(await readRowHeight(page, dataGrid)).toStrictEqual(LOGS_PROFILE_ROW_HEIGHT);
        await setRowHeight(page, dataGrid, 'Auto');

        // `my-example-*` resolves no data source profile, so it inherits rather than resets.
        await discover.writeAndSubmitEsqlQuery(`from ${CONTEXT_AWARENESS_DATA_VIEWS.ALL}`);
        expect(await readRowHeight(page, dataGrid)).toStrictEqual(AUTO_ROW_HEIGHT);

        await setRowHeight(page, dataGrid, 'Custom', 2);

        await discover.writeAndSubmitEsqlQuery(`from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS}`);
        expect(await readRowHeight(page, dataGrid)).toStrictEqual(AUTO_ROW_HEIGHT);

        await discover.writeAndSubmitEsqlQuery(`from ${CONTEXT_AWARENESS_DATA_VIEWS.ALL}`);
        expect(await readRowHeight(page, dataGrid)).toStrictEqual({
          value: 'Custom',
          lineCount: '2',
        });
      }
    );

    spaceTest(
      'applies UI, persistent, and URL profile state through refresh, restore, duplicate, and tab switch',
      async ({ page, pageObjects }) => {
        const { dataGrid, discover, docViewer, unifiedTabs } = pageObjects;

        const timestampColor = page.testSubj.locator(TIMESTAMP_COLOR_SELECT);
        const rowControlColor = page.testSubj.locator(ROW_CONTROL_COLOR_SELECT);
        const boxColor = page.testSubj.locator(BOX_COLOR_SELECT);
        const renderedTimestamp = dataGrid
          .getCell(0, '@timestamp')
          .locator('[data-test-subj="exampleRootProfileTimestamp"]');

        await openProfileStateDocView(page, docViewer);
        await expect(timestampColor).toHaveValue('hollow');
        await expect(rowControlColor).toHaveValue('text');
        await expect(boxColor).toHaveValue('transparent');

        await timestampColor.selectOption('danger');
        await expect(renderedTimestamp).toHaveAttribute('data-color', 'danger');
        await rowControlColor.selectOption('warning');
        await boxColor.selectOption('danger');

        await expect.poll(() => getStoredTabs(page)).toContain('warning');
        await expect
          .poll(() => getProfileUrlState(page))
          .toStrictEqual({ exampleProfileState: { boxColor: 'danger' } });

        // Only the URL-backed colour is part of history, so stepping back drops it alone.
        await page.goBack();
        await expect.poll(() => getProfileUrlState(page)).toBeUndefined();
        await expect(boxColor).toHaveValue('transparent');

        await page.goForward();
        await expect
          .poll(() => getProfileUrlState(page))
          .toStrictEqual({ exampleProfileState: { boxColor: 'danger' } });
        await expect(boxColor).toHaveValue('danger');

        // Reload keeps the persistent and URL colours; the UI-only timestamp falls back.
        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await openProfileStateDocView(page, docViewer);
        await expect(timestampColor).toHaveValue('hollow');
        await expect(rowControlColor).toHaveValue('warning');
        await expect(boxColor).toHaveValue('danger');

        await timestampColor.selectOption('accent');

        await discover.createNewTabAndSearch();
        await unifiedTabs.closeTab(0);
        await expect.poll(() => getStoredTabs(page)).toContain('closedAt');

        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await expect.poll(() => getStoredTabs(page)).toContain('closedAt');

        // Restoring rebuilds the tab from persisted state, so the UI-only colour is gone again.
        await unifiedTabs.restoreRecentlyClosedTab(0);
        await discover.waitUntilTabIsLoaded();
        await openProfileStateDocView(page, docViewer);
        await expect(timestampColor).toHaveValue('hollow');
        await expect(rowControlColor).toHaveValue('warning');
        await expect(boxColor).toHaveValue('danger');

        await timestampColor.selectOption('accent');

        // Duplicating copies the live tab, so here the UI-only colour does come across.
        await unifiedTabs.duplicateTab(1);
        await discover.waitUntilTabIsLoaded();
        await openProfileStateDocView(page, docViewer);
        await expect(timestampColor).toHaveValue('accent');
        await expect(rowControlColor).toHaveValue('warning');
        await expect(boxColor).toHaveValue('danger');

        await timestampColor.selectOption('success');
        await rowControlColor.selectOption('primary');
        await boxColor.selectOption('success');
        await expect.poll(() => getStoredTabs(page)).toContain('primary');
        await expect
          .poll(() => getProfileUrlState(page))
          .toStrictEqual({ exampleProfileState: { boxColor: 'success' } });

        // The tab the duplicate came from keeps its own copy of all three.
        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await expect(timestampColor).toHaveValue('accent');
        await expect(rowControlColor).toHaveValue('warning');
        await expect(boxColor).toHaveValue('danger');
        await expect
          .poll(() => getProfileUrlState(page))
          .toStrictEqual({ exampleProfileState: { boxColor: 'danger' } });
      }
    );

    spaceTest(
      'restores persistent and URL profile state from a shared locator',
      async ({ page, pageObjects }) => {
        const { discover, docViewer } = pageObjects;

        const timestampColor = page.testSubj.locator(TIMESTAMP_COLOR_SELECT);
        const rowControlColor = page.testSubj.locator(ROW_CONTROL_COLOR_SELECT);
        const boxColor = page.testSubj.locator(BOX_COLOR_SELECT);

        await openProfileStateDocView(page, docViewer);
        await timestampColor.selectOption('danger');
        await rowControlColor.selectOption('warning');
        await boxColor.selectOption('danger');

        const sharedUrl = await discover.getSharedUrl();
        await discover.closeShareModal();

        // Clearing storage leaves the share link as the only carrier of the state.
        await page.evaluate(() => {
          window.localStorage.clear();
          window.sessionStorage.clear();
        });

        await page.goto(sharedUrl);
        await discover.waitUntilTabIsLoaded();
        await openProfileStateDocView(page, docViewer);

        await expect(timestampColor).toHaveValue('hollow');
        await expect(rowControlColor).toHaveValue('warning');
        await expect(boxColor).toHaveValue('danger');
        await expect
          .poll(() => getProfileUrlState(page))
          .toStrictEqual({ exampleProfileState: { boxColor: 'danger' } });
      }
    );
  }
);
