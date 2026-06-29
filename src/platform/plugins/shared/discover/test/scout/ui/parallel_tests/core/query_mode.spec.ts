/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Stateful-only Scout migration of `src/platform/test/functional/apps/discover/query_mode`.
 * The sibling `query_mode_esql_default` suite remains on FTR because it toggles
 * a server-wide feature flag.
 */

import { expect } from '@kbn/scout/ui';
import type { ScoutPage, ScoutTestFixtures } from '@kbn/scout';
import { getStoredQueryMode } from '../../fixtures/common/helpers';
import { spaceTest } from '../../fixtures/common';

const gotoDiscoverAndWait = async ({
  page,
  pageObjects,
}: {
  page: ScoutPage;
  pageObjects: ScoutTestFixtures['pageObjects'];
}) => {
  await page.gotoApp('discover');
  await pageObjects.discover.waitUntilTabIsLoaded();
};

const expectQueryMode = async ({
  pageObjects,
  expectedMode,
}: {
  pageObjects: ScoutTestFixtures['pageObjects'];
  expectedMode: 'classic' | 'esql';
}) => {
  expect(await pageObjects.discover.getCurrentQueryMode()).toBe(expectedMode);
};

spaceTest.describe('Discover query mode', { tag: '@local-stateful-classic' }, () => {
  spaceTest.use({ viewport: { width: 1600, height: 1200 } });

  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'opens Discover in classic mode when no default query mode is stored',
    async ({ page, pageObjects }) => {
      await gotoDiscoverAndWait({ page, pageObjects });

      await expectQueryMode({ pageObjects, expectedMode: 'classic' });
      expect(await getStoredQueryMode(page)).toBeNull();
    }
  );

  spaceTest(
    'persists ES|QL as the default query mode after the user switches modes',
    async ({ page, pageObjects }) => {
      await gotoDiscoverAndWait({ page, pageObjects });

      await pageObjects.discover.selectTextBaseLang();
      expect(await getStoredQueryMode(page)).toBe('esql');

      await gotoDiscoverAndWait({ page, pageObjects });
      await expectQueryMode({ pageObjects, expectedMode: 'esql' });
    }
  );

  spaceTest(
    'persists classic as the default query mode after switching back from ES|QL',
    async ({ page, pageObjects }) => {
      await gotoDiscoverAndWait({ page, pageObjects });

      await pageObjects.discover.selectTextBaseLang();
      await pageObjects.discover.switchToClassicMode();
      expect(await getStoredQueryMode(page)).toBe('classic');

      await gotoDiscoverAndWait({ page, pageObjects });
      await expectQueryMode({ pageObjects, expectedMode: 'classic' });
    }
  );
});
