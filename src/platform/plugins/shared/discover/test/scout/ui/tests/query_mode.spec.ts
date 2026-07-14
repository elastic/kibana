/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Covers Discover query-mode defaults and persistence between "classic" and "esql".
 *
 * The suite is parameterized with `queryModeTransitions`, so each run starts from
 * one server default (`discover.isEsqlDefault`) and verifies both directions:
 * switching to the opposite mode persists that choice, and switching back persists
 * the original mode again.
 *
 * Because `discover.isEsqlDefault` is a server-wide setting, this spec is intended
 * for the sequential Scout config (single worker) to avoid cross-spec leakage.
 */

import { expect } from '@kbn/scout/ui';
import {
  clearStoredQueryMode,
  switchToMode,
  type QueryMode,
  getCurrentAndStoredMode,
} from '../fixtures/common/helpers';
import { spaceTest } from '../fixtures/common';

interface QueryModeSwitch {
  defaultMode: QueryMode;
  targetMode: QueryMode;
}

const queryModeTransitions: QueryModeSwitch[] = [
  { defaultMode: 'esql', targetMode: 'classic' },
  { defaultMode: 'classic', targetMode: 'esql' },
];

for (const { defaultMode, targetMode } of queryModeTransitions) {
  spaceTest.describe(
    `Discover query mode (default: ${defaultMode})`,
    { tag: '@local-stateful-classic' },
    () => {
      spaceTest.beforeAll(async ({ apiServices, discoverScoutSpace }) => {
        await apiServices.core.settings({
          'feature_flags.overrides': {
            'discover.isEsqlDefault': defaultMode === 'esql',
          },
        });
        await discoverScoutSpace.setupDiscoverDefaults();
      });

      spaceTest.beforeEach(async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginAsViewer();
        await page.gotoApp('discover');
        await pageObjects.discover.waitUntilTabIsLoaded();
      });

      spaceTest.afterEach(async ({ page }) => {
        await clearStoredQueryMode(page);
      });

      spaceTest.afterAll(async ({ apiServices, discoverScoutSpace }) => {
        await discoverScoutSpace.teardownDiscoverDefaults();
        await apiServices.core.settings({
          'feature_flags.overrides': {
            'discover.isEsqlDefault': null,
          },
        });
      });

      spaceTest(
        `opens Discover in ${defaultMode} mode when no default query mode is stored`,
        async ({ page, pageObjects }) => {
          const { currentMode, storedMode } = await getCurrentAndStoredMode(page, pageObjects);
          expect(currentMode).toBe(defaultMode);
          expect(storedMode).toBeNull();

          await spaceTest.step(
            `persists ${targetMode} as the default query mode after the user switches modes`,
            async () => {
              await switchToMode(page, pageObjects, targetMode);
              const modeState = await getCurrentAndStoredMode(page, pageObjects);
              expect(modeState.currentMode).toBe(targetMode);
              expect(modeState.storedMode).toBe(targetMode);
            }
          );

          await spaceTest.step(
            `persists ${defaultMode} as the default query mode after the user switches modes`,
            async () => {
              await switchToMode(page, pageObjects, defaultMode);
              const modeState = await getCurrentAndStoredMode(page, pageObjects);
              expect(modeState.currentMode).toBe(defaultMode);
              expect(modeState.storedMode).toBe(defaultMode);
            }
          );
        }
      );
    }
  );
}
