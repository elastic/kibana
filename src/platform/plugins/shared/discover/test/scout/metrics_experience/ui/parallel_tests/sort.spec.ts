/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Sort control tests: the sort selector is gated behind the
 * `discover.metricsExperienceSortEnabled` feature flag, which is enabled once
 * for the whole parallel suite in `parallel_tests/global.setup.ts`.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE, DEFAULT_CONFIG } from '../fixtures';

const ALPHABETICALLY_SORTED_METRICS = [...DEFAULT_CONFIG.metrics].sort((a, b) =>
  a.name.localeCompare(b.name)
);
const FIRST_CARD_ASC = `${ALPHABETICALLY_SORTED_METRICS[0].name}-0`;
const FIRST_CARD_DESC = `${
  ALPHABETICALLY_SORTED_METRICS[ALPHABETICALLY_SORTED_METRICS.length - 1].name
}-0`;

spaceTest.describe(
  'Metrics in Discover - Sorting',
  {
    tag: testData.METRICS_EXPERIENCE_TAGS,
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'esql' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'shows the sort control when the feature flag is enabled',
      async ({ pageObjects }) => {
        await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        const { metricsExperience } = pageObjects;

        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.sortSelectorButton).toBeVisible();
        await expect(metricsExperience.sortDirectionAsc).toBeVisible();
        await expect(metricsExperience.sortDirectionDesc).toBeVisible();
      }
    );

    spaceTest('reorders the grid when toggling sort direction', async ({ pageObjects }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;

      await spaceTest.step('defaults to ascending order', async () => {
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_ASC);
      });

      await spaceTest.step('descending puts the last metric first', async () => {
        await metricsExperience.setSortDirection('desc');
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_DESC);
      });

      await spaceTest.step('ascending restores the original order', async () => {
        await metricsExperience.setSortDirection('asc');
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_ASC);
      });
    });

    spaceTest('restores a non-default sort after a page reload', async ({ pageObjects, page }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;

      await spaceTest.step('a fresh session defaults to ascending order', async () => {
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_ASC);
      });

      await spaceTest.step('change the sort to descending', async () => {
        await metricsExperience.setSortDirection('desc');
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_DESC);
      });

      await spaceTest.step('wait for the sort to be persisted to local tab storage', async () => {
        // Tab state is written to local storage on a trailing throttle, so an
        // immediate reload could race the write. Poll storage until the sort
        // lands to deterministically test "persisted sort survives a reload".
        await expect
          .poll(() => metricsExperience.getPersistedMetricsStateField('sortDirection'))
          .toBe('desc');
      });

      await spaceTest.step('the descending sort survives a full page reload', async () => {
        await page.reload();
        // The grid only mounts once the post-reload metrics fetch resolves, and a cold
        // Discover re-init plus that fetch regularly exceeds the default 10s on serverless CI
        // (matching `waitForDiscoverPage`'s own 30s allowance for the same reason).
        await expect(metricsExperience.grid).toBeVisible({ timeout: 30_000 });
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_DESC);
      });
    });

    spaceTest('reflects a non-default sort in the URL', async ({ pageObjects, page }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;

      await spaceTest.step('a fresh session carries no sort in the URL', async () => {
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_ASC);
        expect(metricsExperience.getProfileState(page.url())).not.toContain('sortDirection');
      });

      await spaceTest.step('changing the sort writes it to the URL', async () => {
        await metricsExperience.setSortDirection('desc');
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_DESC);
        // The URL is written through `kbnUrlControls`, which batches asynchronously and so is
        // not settled by the time the grid has re-rendered.
        await expect
          .poll(() => metricsExperience.getProfileState(page.url()))
          .toContain('sortDirection:desc');
      });

      await spaceTest.step('restoring the default sort strips it from the URL', async () => {
        await metricsExperience.setSortDirection('asc');
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_ASC);
        await expect
          .poll(() => metricsExperience.getProfileState(page.url()))
          .not.toContain('sortDirection');
      });
    });

    spaceTest('applies a sort supplied by the URL', async ({ pageObjects, page }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;

      await metricsExperience.setSortDirection('desc');
      await expect
        .poll(() => metricsExperience.getProfileState(page.url()))
        .toContain('sortDirection:desc');
      // Wait for 'desc' to land in local storage before capturing the URL and then resetting,
      // so the subsequent cleared-storage check is meaningful.
      await expect
        .poll(() => metricsExperience.getPersistedMetricsStateField('sortDirection'))
        .toBe('desc');
      const descendingUrl = page.url();

      await spaceTest.step('return the locally persisted sort to the default', async () => {
        // Locally persisted state must disagree with the URL, otherwise a passing assertion
        // below could be explained by local tab storage rather than by the URL.
        await metricsExperience.setSortDirection('asc');
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_ASC);
        await expect
          .poll(() => metricsExperience.getProfileState(page.url()))
          .not.toContain('sortDirection');
        // The default 'asc' is stripped from storage rather than written, so we cannot poll for
        // its presence. Instead poll until sortDirection is absent, confirming the throttled
        // tab-state write has settled before we navigate to the captured URL.
        await expect
          .poll(() => metricsExperience.getPersistedMetricsStateField('sortDirection'))
          .toBeUndefined();
      });

      await spaceTest.step('opening the captured URL applies its sort', async () => {
        await page.goto(descendingUrl);
        // See the reload test above for why a cold Discover re-init needs the longer timeout.
        await expect(metricsExperience.grid).toBeVisible({ timeout: 30_000 });
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_DESC);
      });
    });
  }
);
