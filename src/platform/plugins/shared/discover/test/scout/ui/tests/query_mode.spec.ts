/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover supports two query modes: "classic" (data view based) and "esql".
 * Which mode Discover opens in by default is controlled by the server-wide
 * `discover.isEsqlDefault` feature flag, and the last mode the user picked is
 * persisted in browser storage.
 *
 * To get full coverage without duplicating specs, this suite is parameterized
 * over both values of `discover.isEsqlDefault`: the entire describe block below
 * runs once with the flag off (classic default) and once with it on (ES|QL
 * default). The flag is toggled per iteration in `beforeAll`/`afterAll`.
 *
 * Because `discover.isEsqlDefault` is server-wide, this suite lives in the
 * sequential `playwright.config.ts` (single worker) rather than the parallel
 * config: toggling it while other spec files run concurrently against the same
 * Kibana server would leak the flag into those specs.
 */

import { expect } from '@kbn/scout/ui';
import type { ScoutTestFixtures } from '@kbn/scout';
import {
  clearStoredQueryMode,
  getStoredQueryMode,
  waitForStoredQueryMode,
} from '../fixtures/common/helpers';
import { spaceTest } from '../fixtures/common';

type QueryMode = 'classic' | 'esql';

// The two query modes are treated as data so the persistence test can be
// generated for each of them instead of being written out by hand.
const QUERY_MODES: readonly QueryMode[] = ['esql', 'classic'];

// Performs the UI action that switches Discover into the given mode. Each mode
// has its own control, so this maps a mode to the right interaction.
const switchToMode = async (
  page: ScoutTestFixtures['page'],
  pageObjects: ScoutTestFixtures['pageObjects'],
  mode: QueryMode
) => {
  if (mode === 'esql') {
    await pageObjects.discover.selectTextBaseLang();
  } else {
    await pageObjects.discover.selectClassicMode();
  }
  await waitForStoredQueryMode(page, mode);
  // Reload and confirm the persisted mode is restored.
  await page.gotoApp('discover');
  await pageObjects.discover.waitUntilTabIsLoaded();
};

const getTargetNode = (defaultNode: QueryMode) => (defaultNode === 'esql' ? 'classic' : 'esql');

for (const defaultMode of QUERY_MODES) {
  spaceTest.describe(
    `Discover query mode (default: ${defaultMode})`,
    { tag: '@local-stateful-classic' },
    () => {
      // Apply this iteration's feature flag value and set up the Discover data
      // (data views, sample docs, etc.) before any test runs.
      spaceTest.beforeAll(async ({ apiServices, discoverScoutSpace }) => {
        await apiServices.core.settings({
          'feature_flags.overrides': {
            'discover.isEsqlDefault': defaultMode === 'esql',
          },
        });
        await discoverScoutSpace.setupDiscoverDefaults();
      });

      // Start every test from a clean slate: a fresh viewer session on Discover
      // with no previously persisted query mode, so each test controls its own
      // starting state.
      spaceTest.beforeEach(async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginAsViewer();
        await page.gotoApp('discover');
        await pageObjects.discover.waitUntilTabIsLoaded();
      });

      spaceTest.afterEach(async ({ page }) => {
        await clearStoredQueryMode(page);
      });

      // Tear down Discover data, reset the feature flag so it can't leak into
      // other suites, and clear any persisted query mode.
      spaceTest.afterAll(async ({ apiServices, discoverScoutSpace }) => {
        await discoverScoutSpace.teardownDiscoverDefaults();
        await apiServices.core.settings({
          'feature_flags.overrides': {
            'discover.isEsqlDefault': null,
          },
        });
      });

      // With nothing persisted, Discover should fall back to the mode dictated by
      // the feature flag (and confirm that nothing was stored yet).
      spaceTest(
        `opens Discover in ${defaultMode} mode when no default query mode is stored`,
        async ({ page, pageObjects }) => {
          expect(await pageObjects.discover.getCurrentQueryMode()).toBe(defaultMode);
          expect(await getStoredQueryMode(page)).toBeNull();
          const targetMode = getTargetNode(defaultMode);

          await spaceTest.step(
            `persists ${targetMode} as the default query mode after the user switches modes`,
            async () => {
              await switchToMode(page, pageObjects, targetMode);
              expect(await pageObjects.discover.getCurrentQueryMode()).toBe(targetMode);
              expect(await getStoredQueryMode(page)).toBe(targetMode);
            }
          );

          await spaceTest.step(
            `persists ${defaultMode} as the default query mode after the user switches modes`,
            async () => {
              await switchToMode(page, pageObjects, defaultMode);
              expect(await pageObjects.discover.getCurrentQueryMode()).toBe(defaultMode);
              expect(await getStoredQueryMode(page)).toBe(defaultMode);
            }
          );
        }
      );
    }
  );
}
