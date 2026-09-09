/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Verifies that opening an ES|QL saved search renders the expected data-grid
 * columns for both non-transformational (`FROM ...`) and transformational
 * (`... | KEEP ...`) commands, and that column state is restored correctly when
 * switching between saved searches.
 *
 * Migrated from `src/platform/test/functional/apps/discover/esql_1/_esql_columns.ts`
 * (`initial columns` group).
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe(
  'Discover ES|QL columns - initial columns',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      await discoverScoutSpace.savedObjects.load(testData.DISCOVER_ESQL_COLUMNS_KBN_ARCHIVE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'renders initial columns for non-transformational commands',
      async ({ pageObjects }) => {
        await pageObjects.discover.loadSavedSearch('nonTransformationalInitialColumns');
        await expect(pageObjects.discover.getDocHeaderLabels()).toHaveText(
          ['@timestamp', 'Summary'],
          { useInnerText: true }
        );
      }
    );

    spaceTest(
      'renders custom columns for non-transformational commands',
      async ({ pageObjects }) => {
        await pageObjects.discover.loadSavedSearch('nonTransformationalCustomColumns');
        await expect(pageObjects.discover.getDocHeaderLabels()).toHaveText(
          ['@timestamp', 'bytes', 'extension'],
          { useInnerText: true }
        );
      }
    );

    spaceTest('renders initial columns for a transformational command', async ({ pageObjects }) => {
      await pageObjects.discover.loadSavedSearch('transformationalInitialColumns');
      await expect(pageObjects.discover.getDocHeaderLabels()).toHaveText(['ip', '@timestamp'], {
        useInnerText: true,
      });
    });

    spaceTest('renders custom columns for a transformational command', async ({ pageObjects }) => {
      await pageObjects.discover.loadSavedSearch('transformationalCustomColumns');
      await expect(pageObjects.discover.getDocHeaderLabels()).toHaveText(['ip', 'bytes'], {
        useInnerText: true,
      });
    });

    spaceTest(
      'restores columns correctly when switching between saved searches',
      async ({ pageObjects }) => {
        await pageObjects.discover.loadSavedSearch('nonTransformationalInitialColumns');
        await expect(pageObjects.discover.getDocHeaderLabels()).toHaveText(
          ['@timestamp', 'Summary'],
          { useInnerText: true }
        );

        await pageObjects.discover.loadSavedSearch('nonTransformationalCustomColumns');
        await expect(pageObjects.discover.getDocHeaderLabels()).toHaveText(
          ['@timestamp', 'bytes', 'extension'],
          { useInnerText: true }
        );
      }
    );
  }
);
