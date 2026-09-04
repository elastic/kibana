/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags, testData } from '../../../common/ui/fixtures';

const REPORT_GENERATION_TIMEOUT = 120_000;
const NEW_SEARCH_TITLE = 'Scout CSV export new search';

spaceTest.describe('Discover CSV export', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.setTimeout(REPORT_GENERATION_TIMEOUT + 30_000);

  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('exports a newly saved classic session', async ({ pageObjects }) => {
    await pageObjects.discover.saveSearch(NEW_SEARCH_TITLE);

    const download = await pageObjects.discover.exportAsCsv({
      timeout: REPORT_GENERATION_TIMEOUT,
    });

    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  spaceTest('exports an ES|QL session', async ({ pageObjects }) => {
    await pageObjects.discover.writeAndSubmitEsqlQuery(
      'from logstash-* | stats count = count(bytes) by geo.dest | sort count desc'
    );

    const download = await pageObjects.discover.exportAsCsv({
      timeout: REPORT_GENERATION_TIMEOUT,
    });

    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  spaceTest('exports a saved Discover session', async ({ pageObjects }) => {
    await pageObjects.discover.loadSavedSearch(testData.SAVED_SEARCH_TITLE);

    const download = await pageObjects.discover.exportAsCsv({
      timeout: REPORT_GENERATION_TIMEOUT,
    });

    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  spaceTest('exports a filtered saved Discover session', async ({ pageObjects }) => {
    await pageObjects.discover.loadSavedSearch(testData.SAVED_SEARCH_TITLE);
    await pageObjects.filterBar.addFilter({
      field: 'extension',
      operator: 'is',
      value: 'png',
    });
    await pageObjects.discover.waitUntilSearchingHasFinished();

    expect(await pageObjects.filterBar.hasFilter({ field: 'extension', value: 'png' })).toBe(true);

    const download = await pageObjects.discover.exportAsCsv({
      timeout: REPORT_GENERATION_TIMEOUT,
    });

    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});
