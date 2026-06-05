/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover unsaved-changes indicator under ES|QL: indicator should appear
 * only after editing a persisted ES|QL saved search, including across page
 * reloads. Migrated from the "should not show…ES|QL saved search…" test in
 * `src/platform/test/functional/apps/discover/group12/_unsaved_changes_notification_indicator.ts`.
 */

import { spaceTest, tags } from '@kbn/scout';
import { testData } from '../../fixtures/common';

const SAVED_SEARCH_ESQL = 'test saved search ES|QL';
const INITIAL_QUERY = 'from logstash-* | limit 10';
const EDITED_QUERY = 'from logstash-* | limit 100';

spaceTest.describe('Discover - unsaved changes (ES|QL)', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('persists clean state across reload, flips on edit', async ({ page, pageObjects }) => {
    await pageObjects.discover.writeAndSubmitEsqlQuery(INITIAL_QUERY);
    await pageObjects.discover.saveSearch(SAVED_SEARCH_ESQL);
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.ensureNoUnsavedChangesIndicator();

    // Reload should not surface "unsaved changes" because the page state
    // matches the just-persisted saved search.
    await page.reload();
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.ensureNoUnsavedChangesIndicator();

    // Editing the query and re-running it must flip the indicator.
    await pageObjects.discover.codeEditor.setCodeEditorValue(EDITED_QUERY);
    await page.testSubj.click('querySubmitButton');
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.ensureHasUnsavedChangesIndicator();
  });
});
