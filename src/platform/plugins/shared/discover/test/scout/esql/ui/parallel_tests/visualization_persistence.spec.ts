/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Migrated from `src/platform/test/functional/apps/discover/group10/_lens_vis.ts`. */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const ESQL_LIMIT_QUERY = 'from logstash-* | limit 10';
const ESQL_STATS_QUERY = 'from logstash-* | stats averageB = avg(bytes) by extension';

spaceTest.describe(
  'Discover ES|QL visualization persistence',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'renders an ES|QL histogram and updates it for a new time range',
      async ({ page, pageObjects }) => {
        const { datePicker, discover } = pageObjects;

        await discover.writeAndSubmitEsqlQuery(ESQL_LIMIT_QUERY);
        await expect(discover.getHistogramChart()).toBeVisible();
        await expect(discover.getHitCountLocator()).toHaveText('10');
        expect(await discover.getHistogramSuggestionType()).toBe('histogramForESQL');
        await expect(page.testSubj.locator('unifiedHistogramSaveVisualization')).toBeVisible();
        await expect(
          page.testSubj.locator('unifiedHistogramEditFlyoutVisualization')
        ).toBeVisible();
        await expect(page.testSubj.locator('unifiedHistogramEditVisualization')).toBeHidden();
        await expect(
          page.testSubj.locator('unifiedHistogramBreakdownSelectorButton')
        ).toBeVisible();
        await expect(
          page.testSubj.locator('unifiedHistogramTimeIntervalSelectorButton')
        ).toBeHidden();

        await datePicker.setAbsoluteRange({
          from: 'Sep 20, 2015 @ 00:00:00.000',
          to: 'Sep 20, 2015 @ 00:00:00.000',
        });
        await discover.waitUntilSearchingHasFinished();

        await expect(discover.getHitCountLocator()).toHaveText('1');
        await expect(discover.getHistogramChart()).toBeVisible();
      }
    );

    spaceTest(
      'persists a Line histogram and reverts a shape change',
      async ({ pageObjects, scoutSpace }) => {
        const { discover } = pageObjects;
        const sessionName = `ESQL Line histogram ${scoutSpace.id}`;

        await discover.writeAndSubmitEsqlQuery(ESQL_LIMIT_QUERY);
        await discover.changeVisualizationShape('Line');
        expect(await discover.getVisualizationTitle()).toBe('Line');
        await discover.saveSearch(sessionName);
        await discover.clickNewSearch();
        await discover.loadSavedSearch(sessionName);
        expect(await discover.getVisualizationTitle()).toBe('Line');

        await discover.changeVisualizationShape('Area');
        expect(await discover.getVisualizationTitle()).toBe('Area');
        await expect(discover.unsavedChangesIndicator()).toBeVisible();
        await discover.revertUnsavedChanges();
        expect(await discover.getVisualizationTitle()).toBe('Line');
        await expect(discover.unsavedChangesIndicator()).toBeHidden();
      }
    );

    spaceTest(
      'changes an ES|QL histogram to a breakdown and a Lens suggestion',
      async ({ page, pageObjects, scoutSpace }) => {
        const { discover } = pageObjects;
        const sessionName = `ESQL direct Treemap ${scoutSpace.id}`;

        await discover.writeAndSubmitEsqlQuery(
          'from logstash-* | sort @timestamp desc | limit 100'
        );
        await discover.changeVisualizationShape('Line');
        await discover.chooseBreakdownField('extension');
        expect(await discover.getVisualizationTitle()).toBe('Bar');
        expect(await discover.getHistogramSuggestionType()).toBe('histogramForESQL');

        await discover.writeAndSubmitEsqlQuery(ESQL_STATS_QUERY);
        await discover.chooseVisualizationSuggestion('treemap');
        await expect(page.testSubj.locator('partitionVisChart')).toBeVisible();
        expect(await discover.getHistogramSuggestionType()).toBe('lensSuggestion');
        await discover.saveSearch(sessionName);
        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await expect(page.testSubj.locator('partitionVisChart')).toBeVisible();
        expect(await discover.getVisualizationTitle()).toBe('Treemap');
      }
    );

    spaceTest(
      'retains compatible visualization changes and reverts incompatible query changes',
      async ({ pageObjects, scoutSpace }) => {
        const { discover } = pageObjects;
        const sessionName = `ESQL query revert ${scoutSpace.id}`;

        await discover.writeAndSubmitEsqlQuery(ESQL_LIMIT_QUERY);
        await discover.changeVisualizationShape('Line');
        await discover.saveSearch(sessionName);

        await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 100');
        await expect(discover.getHitCountLocator()).toHaveText('100');
        expect(await discover.getVisualizationTitle()).toBe('Line');
        await expect(discover.unsavedChangesIndicator()).toBeVisible();

        await discover.writeAndSubmitEsqlQuery(ESQL_STATS_QUERY);
        await discover.chooseVisualizationSuggestion('treemap');
        await expect(discover.getHistogramChart()).toBeVisible();
        expect(await discover.getHistogramSuggestionType()).toBe('lensSuggestion');

        await discover.revertUnsavedChanges();
        expect(await discover.getVisualizationTitle()).toBe('Line');
        expect(await discover.getHistogramSuggestionType()).toBe('histogramForESQL');
        expect(await discover.getEsqlQueryValue()).toBe(ESQL_LIMIT_QUERY);
        await expect(discover.getHitCountLocator()).toHaveText('10');
        await expect(discover.unsavedChangesIndicator()).toBeHidden();
      }
    );

    spaceTest(
      'saves an invalidated histogram as a Lens suggestion and restores it after a query revert',
      async ({ page, pageObjects, scoutSpace }) => {
        const { discover } = pageObjects;
        const sessionName = `ESQL invalidated visualization ${scoutSpace.id}`;

        await discover.writeAndSubmitEsqlQuery(ESQL_LIMIT_QUERY);
        await discover.changeVisualizationShape('Line');
        await discover.saveSearch(sessionName);

        await discover.writeAndSubmitEsqlQuery(ESQL_STATS_QUERY);
        await discover.chooseVisualizationSuggestion('treemap');
        await discover.saveSearchAsNew(`${sessionName} treemap`);
        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await expect(page.testSubj.locator('partitionVisChart')).toBeVisible();
        expect(await discover.getVisualizationTitle()).toBe('Treemap');

        await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 100');
        expect(await discover.getVisualizationTitle()).toBe('Bar');
        expect(await discover.getHistogramSuggestionType()).toBe('histogramForESQL');

        await discover.revertUnsavedChanges();
        await expect(page.testSubj.locator('partitionVisChart')).toBeVisible();
        expect(await discover.getVisualizationTitle()).toBe('Treemap');
        expect(await discover.getHistogramSuggestionType()).toBe('lensSuggestion');
      }
    );

    spaceTest(
      'persists a Lens flyout shape and closes the flyout on revert',
      async ({ page, pageObjects, scoutSpace }) => {
        const { discover } = pageObjects;
        const sessionName = `ESQL Treemap ${scoutSpace.id}`;

        await discover.writeAndSubmitEsqlQuery(ESQL_STATS_QUERY);
        await discover.chooseVisualizationSuggestion('treemap');
        await discover.saveSearch(sessionName);
        await discover.changeVisualizationShape('Pie');
        expect(await discover.getVisualizationTitle()).toBe('Pie');
        await discover.saveUnsavedChanges();
        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await expect(page.testSubj.locator('partitionVisChart')).toBeVisible();
        expect(await discover.getVisualizationTitle()).toBe('Pie');

        await discover.writeAndSubmitEsqlQuery('from logstash-*');
        expect(await discover.getVisualizationTitle()).toBe('Bar');
        expect(await discover.getHistogramSuggestionType()).toBe('histogramForESQL');
        await expect(discover.unsavedChangesIndicator()).toBeVisible();
        await discover.revertUnsavedChanges();
        await expect(page.testSubj.locator('partitionVisChart')).toBeVisible();
        expect(await discover.getVisualizationTitle()).toBe('Pie');

        await discover.changeVisualizationShape('Waffle');
        await discover.openLensEditFlyout();
        await expect(discover.getLensEditFlyout()).toBeVisible();
        await discover.revertUnsavedChanges();

        await expect(discover.getLensEditFlyout()).toBeHidden();
        expect(await discover.getVisualizationTitle()).toBe('Pie');
      }
    );
  }
);
