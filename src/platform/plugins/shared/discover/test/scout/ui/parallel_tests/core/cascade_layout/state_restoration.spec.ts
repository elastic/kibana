/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Verifies that the ES|QL grouped ("cascade") layout's scroll position and
 * row-expansion state both survive switching away from and back to a tab.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';
import { runCascadeQuery } from '../../../fixtures/common/helpers';

const STATS_QUERY =
  'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip | SORT count DESC';

spaceTest.describe(
  'Discover cascade layout - state restoration',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest('restores cascade scroll position when switching tabs', async ({ pageObjects }) => {
      const { discover, unifiedTabs } = pageObjects;

      expect(await runCascadeQuery(pageObjects, STATS_QUERY)).toBe(true);

      await discover.scrollCascadeLayoutBy(2000);
      // The scroll position is persisted for restoration via a
      // debounced/throttled subscription with no externally observable
      // signal, so switching tabs immediately after scrolling can unmount
      // the component before that persistence has a chance to fire -
      // dropping the just-performed scroll and restoring stale state.
      await discover.waitForCascadeStatePersisted();
      const scrollTopBeforeTabSwitch = await discover.getCascadeLayoutScrollTop();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      // The component fully unmounts/remounts across a tab switch, and its
      // scroll anchor is restored while the virtualizer re-measures rows
      // (hidden behind a loading spinner until it stabilizes).
      await discover.waitForCascadeLayoutStable();

      // Polling (rather than a single read) is intentional here: the
      // virtualizer's scroll-anchor correction loop has a bounded retry
      // budget and a timeout failsafe, so it can report itself "stable" (and
      // flip the container visible) slightly before scrollTop has actually
      // caught up to the target offset. Give it a bit more room to converge
      // instead of racing a one-shot read against that.
      await expect
        .poll(async () =>
          Math.abs((await discover.getCascadeLayoutScrollTop()) - scrollTopBeforeTabSwitch)
        )
        .toBeLessThan(200);
    });

    spaceTest(
      'restores expanded state and nested scroll when switching tabs',
      async ({ pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;

        expect(await runCascadeQuery(pageObjects, STATS_QUERY)).toBe(true);
        await discover.scrollCascadeLayoutBy(2000);
        // See the "restores cascade scroll position" test above for why this
        // wait is needed before the next action can safely trigger a remount.
        await discover.waitForCascadeStatePersisted();

        const [targetRowId] = await discover.getCascadeLayoutVisibleRowIds();
        await discover.toggleCascadeLayoutRow(targetRowId);
        await discover.scrollCascadeLayoutBy(200);
        await discover.waitForCascadeStatePersisted();

        const scrollTopBeforeTabSwitch = await discover.getCascadeLayoutScrollTop();

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await discover.waitForCascadeLayoutStable();

        expect(await discover.isCascadeLayoutRowExpanded(targetRowId)).toBe(true);
        // See the "restores cascade scroll position" test above for why this is
        // a poll rather than a single read: "stable" can fire slightly before
        // scrollTop has actually converged.
        await expect
          .poll(async () =>
            Math.abs((await discover.getCascadeLayoutScrollTop()) - scrollTopBeforeTabSwitch)
          )
          .toBeLessThan(200);
      }
    );
  }
);
