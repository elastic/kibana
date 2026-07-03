/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { EuiComboBoxWrapper, KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';

const LOGSTASH_QUERY_START = 'FROM logstash-* | WHERE geo.dest == ';
const ESQL_MULTI_VALUE_QUERY_START = 'FROM logstash-* | WHERE MV_CONTAINS( ';
const ESQL_MULTI_VALUE_QUERY =
  'FROM logstash-* | WHERE MV_CONTAINS( ?values, geo.dest ) | KEEP geo.dest';

const createSessionName = (prefix: string, spaceId: string) => `${prefix}-${spaceId}-${Date.now()}`;

const getControlsGroup = (page: ScoutPage) => page.testSubj.locator('controls-group-wrapper');

const getControlFrames = (page: ScoutPage) => page.testSubj.locator('control-frame');

const getDashboardViewport = (page: ScoutPage) => page.testSubj.locator('dshDashboardViewport');

const getDashboardControls = (page: ScoutPage) =>
  getDashboardViewport(page).locator('[data-control-id]');

const getControlIds = async (page: ScoutPage) => {
  await getControlFrames(page).evaluateAll((frames) => {
    if (!frames.length) {
      throw new Error('No control frames found');
    }
  });

  return getControlFrames(page)
    .locator('[data-control-id]')
    .evaluateAll((controls) => {
      return controls.map((control) => control.getAttribute('data-control-id') ?? '');
    });
};

const getOnlyControlId = async (page: ScoutPage) => {
  await expect(getControlFrames(page)).toHaveCount(1);
  const controlIds = await getControlIds(page);

  if (controlIds.length !== 1 || !controlIds[0]) {
    throw new Error(`Expected exactly one control id, got: ${controlIds.join(', ')}`);
  }

  return controlIds[0];
};

const getControlFrame = (page: ScoutPage, controlId: string): Locator =>
  getControlFrames(page)
    .locator(`[data-control-id='${controlId}']`)
    .locator('xpath=ancestor::*[@data-test-subj="control-frame"][1]');

const openControlPopover = async (page: ScoutPage, controlId: string) => {
  await getControlFrame(page, controlId).locator(`[data-control-id='${controlId}']`).click();
  await page.testSubj.locator('optionsList-control-search-input').waitFor({ state: 'visible' });
};

const selectControlOption = async (page: ScoutPage, value: string) => {
  const searchInput = page.testSubj.locator('optionsList-control-search-input');
  await searchInput.fill(value);

  const option = page.testSubj.locator(`optionsList-control-selection-${value}`);
  await option.waitFor({ state: 'visible' });
  await option.click();
};

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
    const valuesComboBox = new EuiComboBoxWrapper(page, 'esqlValuesOptions');
    for (const value of values) {
      await valuesComboBox.setCustomMultiOption(value, { useFill: true });
    }
  }

  await page.testSubj.locator('saveEsqlControlsFlyoutButton').waitFor({ state: 'visible' });
  await page.testSubj.locator('saveEsqlControlsFlyoutButton').click();
  await page.testSubj.locator('create_esql_control_flyout').waitFor({ state: 'hidden' });
  await getControlsGroup(page).waitFor({ state: 'visible' });
};

const saveHistogramToNewDashboard = async (page: ScoutPage, title: string) => {
  await page.testSubj.locator('unifiedHistogramSaveVisualization').click();
  await page.testSubj.locator('savedObjectSaveModal').waitFor({ state: 'visible' });
  await page.testSubj.locator('savedObjectTitle').fill(title);
  await page.testSubj
    .locator('add-to-dashboard-options')
    .locator('label[for="new-dashboard-option"]')
    .click();

  await page.testSubj.locator('confirmSaveSavedObjectButton').click();
  await page.testSubj.locator('savedObjectSaveModal').waitFor({ state: 'hidden' });
};

const removeOnlyControl = async (page: ScoutPage) => {
  const controlId = await getOnlyControlId(page);
  const controlFrame = getControlFrame(page, controlId);
  await controlFrame.locator(`[data-control-id='${controlId}']`).hover();

  const hoverActions = controlFrame.getByTestId(`hover-actions-${controlId}`);
  await hoverActions.waitFor({ state: 'visible' });

  const deleteAction = hoverActions.getByTestId('embeddablePanelAction-deletePanel');
  await deleteAction.waitFor({ state: 'visible' });
  await deleteAction.click();
  await expect(getControlFrames(page)).toHaveCount(0);
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
      const { discover } = pageObjects;

      await createEsqlControl(page, LOGSTASH_QUERY_START);
      await discover.waitUntilTabIsLoaded();

      await getControlsGroup(page).waitFor({ state: 'visible' });
      expect(await discover.getEsqlQueryValue()).toContain(
        'FROM logstash-* | WHERE geo.dest == ?geo_dest'
      );

      await page.reload();
      await discover.waitUntilTabIsLoaded();

      await getControlsGroup(page).waitFor({ state: 'visible' });
      await expect(getControlFrames(page)).toHaveCount(1);
    }
  );

  spaceTest(
    'creates an ES|QL multi-value control and filters grid rows',
    async ({ page, pageObjects }) => {
      const { dataGrid, discover } = pageObjects;

      await createEsqlControl(page, ESQL_MULTI_VALUE_QUERY_START, { values: ['IN', 'US'] });
      await discover.waitUntilTabIsLoaded();

      await getControlsGroup(page).waitFor({ state: 'visible' });
      expect(await discover.getEsqlQueryValue()).toContain(
        'FROM logstash-* | WHERE MV_CONTAINS( ?values'
      );

      await discover.codeEditor.setCodeEditorValue(ESQL_MULTI_VALUE_QUERY);
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await dataGrid.waitForLoad();
      await dataGrid.waitForDocTableRendered();

      expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);

      const controlId = await getOnlyControlId(page);
      await openControlPopover(page, controlId);
      await selectControlOption(page, 'US');
      await discover.waitUntilTabIsLoaded();
      await dataGrid.waitForLoad();
      await dataGrid.waitForDocTableRendered();

      expectOnlyRowsContaining(await discover.getDataGridRows(), ['US', 'IN']);
    }
  );

  spaceTest(
    'persists controls through saved sessions and unsaved-change revert',
    async ({ page, pageObjects, scoutSpace }) => {
      const { discover } = pageObjects;
      const savedSession = createSessionName('esql-control-session', scoutSpace.id);

      await createEsqlControl(page, LOGSTASH_QUERY_START);
      await discover.waitUntilTabIsLoaded();
      await discover.saveSearch(savedSession);
      await discover.waitUntilTabIsLoaded();
      await getControlsGroup(page).waitFor({ state: 'visible' });

      await discover.clickNewSearch();
      await discover.loadSavedSearch(savedSession);
      await discover.waitUntilTabIsLoaded();
      await getControlsGroup(page).waitFor({ state: 'visible' });
      await expect(getControlFrames(page)).toHaveCount(1);

      const controlId = await getOnlyControlId(page);
      await openControlPopover(page, controlId);
      await selectControlOption(page, 'CN');
      await discover.waitUntilTabIsLoaded();

      await discover.unsavedChangesIndicator().waitFor({ state: 'visible' });
      await discover.revertUnsavedChanges();
      await discover.waitUntilTabIsLoaded();
      await discover.unsavedChangesIndicator().waitFor({ state: 'hidden' });
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
      await getControlsGroup(page).waitFor({ state: 'visible' });

      await saveHistogramToNewDashboard(page, savedChart);
      await dashboard.waitForRenderComplete();
      await expect(getDashboardControls(page)).toHaveCount(1);

      await dashboard.openNewDashboard();
      await dashboard.addSavedSearch(savedSession);
      await dashboard.waitForRenderComplete();
      await expect(getDashboardControls(page)).toHaveCount(1);
    }
  );

  spaceTest(
    'persists saved sessions after removing controls',
    async ({ page, pageObjects, scoutSpace }) => {
      const { discover } = pageObjects;
      const savedSession = createSessionName('esql-control-removed-session', scoutSpace.id);

      await createEsqlControl(page, LOGSTASH_QUERY_START);
      await discover.waitUntilTabIsLoaded();
      await expect(getControlFrames(page)).toHaveCount(1);

      await discover.saveSearch(savedSession);
      await discover.waitUntilTabIsLoaded();

      await removeOnlyControl(page);
      await discover.waitUntilTabIsLoaded();
      await getControlsGroup(page).waitFor({ state: 'hidden' });

      await discover.saveSearch(savedSession);
      await discover.waitUntilTabIsLoaded();
      await discover.clickNewSearch();
      await discover.loadSavedSearch(savedSession);
      await discover.waitUntilTabIsLoaded();

      await getControlsGroup(page).waitFor({ state: 'hidden' });
      await expect(getControlFrames(page)).toHaveCount(0);
    }
  );
});
