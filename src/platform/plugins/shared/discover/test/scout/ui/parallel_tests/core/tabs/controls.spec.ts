/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';

const LOGSTASH_QUERY_START = 'FROM logstash-* | WHERE geo.dest == ';
const ESQL_MULTI_VALUE_QUERY_START = 'FROM logstash-* | WHERE MV_CONTAINS( ';
const ESQL_MULTI_VALUE_QUERY =
  'FROM logstash-* | WHERE MV_CONTAINS( ?values, geo.dest ) | KEEP geo.dest';

const createSessionName = (prefix: string, spaceId: string) => `${prefix}-${spaceId}-${Date.now()}`;

const createEsqlControl = async (
  page: ScoutPage,
  query: string,
  { values }: { values?: string[] } = {}
) => {
  const codeEditor = new KibanaCodeEditorWrapper(page);
  await codeEditor.setCodeEditorValue(query);
  await codeEditor.triggerSuggest(query);

  const suggestionWidget = codeEditor.getCodeEditorSuggestWidget();
  await suggestionWidget.waitFor({ state: 'visible' });
  await suggestionWidget.locator('.monaco-list-row', { hasText: 'Create control' }).click();
  await page.testSubj.locator('create_esql_control_flyout').waitFor({ state: 'visible' });

  if (values) {
    const valuesComboBox = page.components.comboBox('esqlValuesOptions');
    for (const value of values) {
      await valuesComboBox.setCustomSelectedOptions([value]);
    }
  }

  await page.testSubj.locator('saveEsqlControlsFlyoutButton').waitFor({ state: 'visible' });
  await page.testSubj.locator('saveEsqlControlsFlyoutButton').click();
  await page.testSubj.locator('create_esql_control_flyout').waitFor({ state: 'hidden' });
  await page.testSubj.locator('controls-group-wrapper').waitFor({ state: 'visible' });
};

const expectOnlyRowsContaining = (rows: string[][], values: string[]) => {
  expect(rows.length).toBeGreaterThan(0);
  expect(
    rows.every((row) => {
      const rowText = row.join(' ');
      return values.some((value) => rowText.includes(value));
    })
  ).toBe(true);
};

spaceTest.describe('Discover tabs - ES|QL controls', { tag: '@local-stateful-classic' }, () => {
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
    'creates an ES|QL value control and keeps it after refresh',
    async ({ page, pageObjects }) => {
      const { dashboard, discover } = pageObjects;

      await createEsqlControl(page, LOGSTASH_QUERY_START);
      await discover.waitUntilTabIsLoaded();

      await expect(dashboard.getControlsGroupLocator()).toBeVisible();
      expect(await discover.getEsqlQueryValue()).toContain(
        'FROM logstash-* | WHERE geo.dest == ?geo_dest'
      );

      await page.reload();
      await discover.waitUntilTabIsLoaded();

      await expect(dashboard.getControlsGroupLocator()).toBeVisible();
      await expect(dashboard.getControlFramesLocator()).toHaveCount(1);
    }
  );

  spaceTest(
    'creates an ES|QL multi-value control and filters grid rows',
    async ({ page, pageObjects }) => {
      const { dashboard, dataGrid, discover } = pageObjects;

      await createEsqlControl(page, ESQL_MULTI_VALUE_QUERY_START, { values: ['IN', 'US'] });
      await discover.waitUntilTabIsLoaded();

      await expect(dashboard.getControlsGroupLocator()).toBeVisible();
      expect(await discover.getEsqlQueryValue()).toContain(
        'FROM logstash-* | WHERE MV_CONTAINS( ?values'
      );

      await discover.codeEditor.setCodeEditorValue(ESQL_MULTI_VALUE_QUERY);
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await dataGrid.waitForLoad();
      await dataGrid.waitForDocTableRendered();

      expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);

      const controlId = await dashboard.getOnlyControlId();
      await dashboard.optionsListOpenPopover(controlId);
      await dashboard.optionsListPopoverSelectOption('US');
      await discover.waitUntilTabIsLoaded();
      await dataGrid.waitForLoad();
      await dataGrid.waitForDocTableRendered();

      expectOnlyRowsContaining(await discover.getDataGridRows(), ['US', 'IN']);
    }
  );

  spaceTest(
    'persists controls through saved sessions and unsaved-change revert',
    async ({ page, pageObjects, scoutSpace }) => {
      const { dashboard, discover } = pageObjects;
      const savedSession = createSessionName('esql-control-session', scoutSpace.id);

      await createEsqlControl(page, LOGSTASH_QUERY_START);
      await discover.waitUntilTabIsLoaded();
      await discover.saveSearch(savedSession);
      await discover.waitUntilTabIsLoaded();
      await expect(dashboard.getControlsGroupLocator()).toBeVisible();

      await discover.clickNewSearch();
      await discover.loadSavedSearch(savedSession);
      await discover.waitUntilTabIsLoaded();
      await expect(dashboard.getControlsGroupLocator()).toBeVisible();
      await expect(dashboard.getControlFramesLocator()).toHaveCount(1);

      const controlId = await dashboard.getOnlyControlId();
      await dashboard.optionsListOpenPopover(controlId);
      await dashboard.optionsListPopoverSelectOption('CN');
      await discover.waitUntilTabIsLoaded();

      await expect(discover.unsavedChangesIndicator()).toBeVisible();
      await discover.revertUnsavedChanges();
      await discover.waitUntilTabIsLoaded();
      await expect(discover.unsavedChangesIndicator()).toBeHidden();
    }
  );

  spaceTest(
    'carries controls into Dashboard panels and saved visualizations',
    async ({ page, pageObjects, scoutSpace }) => {
      const { dashboard, discover } = pageObjects;
      const savedSession = createSessionName('esql-control-dashboard-session', scoutSpace.id);
      const savedChart = createSessionName('esql-control-chart', scoutSpace.id);

      await createEsqlControl(page, LOGSTASH_QUERY_START);
      await discover.waitUntilTabIsLoaded();
      await discover.saveSearch(savedSession);
      await discover.waitUntilTabIsLoaded();

      await discover.clickNewSearch();
      await discover.loadSavedSearch(savedSession);
      await discover.waitUntilTabIsLoaded();
      await expect(dashboard.getControlsGroupLocator()).toBeVisible();

      await discover.saveVisualizationToNewDashboard(savedChart);
      await dashboard.waitForRenderComplete();
      await expect(dashboard.getDashboardControlsLocator()).toHaveCount(1);

      await dashboard.openNewDashboard();
      await dashboard.addSavedSearch(savedSession);
      await dashboard.waitForRenderComplete();
      await expect(dashboard.getDashboardControlsLocator()).toHaveCount(1);
    }
  );

  spaceTest(
    'persists saved sessions after removing controls',
    async ({ page, pageObjects, scoutSpace }) => {
      const { dashboard, discover } = pageObjects;
      const savedSession = createSessionName('esql-control-removed-session', scoutSpace.id);

      await createEsqlControl(page, LOGSTASH_QUERY_START);
      await discover.waitUntilTabIsLoaded();
      await expect(dashboard.getControlFramesLocator()).toHaveCount(1);

      await discover.saveSearch(savedSession);
      await discover.waitUntilTabIsLoaded();

      await dashboard.removeControl(await dashboard.getOnlyControlId());
      await expect(dashboard.getControlFramesLocator()).toHaveCount(0);
      await discover.waitUntilTabIsLoaded();
      await expect(dashboard.getControlsGroupLocator()).toBeHidden();

      await discover.saveSearch(savedSession);
      await discover.waitUntilTabIsLoaded();
      await discover.clickNewSearch();
      await discover.loadSavedSearch(savedSession);
      await discover.waitUntilTabIsLoaded();

      await expect(dashboard.getControlsGroupLocator()).toBeHidden();
      await expect(dashboard.getControlFramesLocator()).toHaveCount(0);
    }
  );
});
