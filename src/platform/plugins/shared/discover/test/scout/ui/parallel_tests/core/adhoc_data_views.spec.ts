/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover ad-hoc data views — the full 8-test journey from
 * `src/platform/test/functional/apps/discover/group4/_adhoc_data_views.ts`.
 *
 * Migrated as a single linear journey (one Scout `test` with sequential
 * `step` blocks) because every step depends on the previous one's state
 * (the same ad-hoc data view, the same runtime field, then a saved search
 * derived from it). Splitting into independent tests would force each to
 * recreate the ad-hoc data view + runtime field, which would dominate run
 * time and lose the very state-transition behavior the test exercises.
 *
 * Tests of `data-test-subj`s used here that don't yet exist in
 * `@kbn/scout` page objects are introduced via the new `DataViews` and
 * `DataViewsFieldEditor` POs in this commit.
 */

import { spaceTest, tags } from '@kbn/scout';
import type { ScoutPage, PageObjects } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const RUNTIME_FIELD = '_bytes-runtimefield';

/**
 * Mirrors FTR `discover.addRuntimeField(name, script)` — opens the
 * "Create field" flyout from the data-view switcher, fills the form, and
 * saves. Lives in the spec because it composes two page objects
 * (`dataViews` + `dataViewsFieldEditor`) and `kbn-scout` POs do not depend
 * on each other.
 */
async function addRuntimeField(
  pageObjects: PageObjects,
  name: string,
  script: string
): Promise<void> {
  await pageObjects.dataViews.clickAddFieldFromSearchBar();
  await pageObjects.dataViewsFieldEditor.setName(name);
  await pageObjects.dataViewsFieldEditor.enableValue();
  await pageObjects.dataViewsFieldEditor.typeScript(script);
  await pageObjects.dataViewsFieldEditor.save();
  await pageObjects.dataViewsFieldEditor.waitUntilClosed();
  await pageObjects.discover.waitUntilSearchingHasFinished();
}

/**
 * Mirrors FTR `discover.removeField(name)` — opens the field popover from
 * the sidebar and confirms the delete-runtime-field modal.
 */
async function removeRuntimeField(
  page: ScoutPage,
  pageObjects: PageObjects,
  name: string
): Promise<void> {
  await page.testSubj.click(`field-${name}`);
  await page.testSubj.click(`discoverFieldListPanelDelete-${name}`);
  await expect(page.testSubj.locator('runtimeFieldDeleteConfirmModal')).toBeVisible();
  await pageObjects.dataViewsFieldEditor.confirmDelete();
  await expect(page.testSubj.locator('runtimeFieldDeleteConfirmModal')).toBeHidden();
  await pageObjects.discover.waitUntilSearchingHasFinished();
}

/** Click "Show surrounding documents" inside the open doc-viewer flyout. */
async function clickSurroundingDocuments(page: ScoutPage): Promise<void> {
  await page.testSubj.click('~docTableRowAction & ~docTableRowAction-surroundingDocument');
}

/** Click "View single document" inside the open doc-viewer flyout. */
async function clickSingleDocument(page: ScoutPage): Promise<void> {
  await page.testSubj.click('~docTableRowAction & ~docTableRowAction-singleDocument');
}

spaceTest.describe('Discover - ad-hoc data views', { tag: tags.stateful.all }, () => {
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

  spaceTest(
    'create, query, save, edit, and embed an ad-hoc data view + runtime field',
    async ({ page, pageObjects }) => {
      // Test 1: navigate back correctly from surrounding and single doc views.
      await spaceTest.step('create ad-hoc data view + runtime field', async () => {
        await pageObjects.dataViews.createFromSearchBar({
          name: 'logstash',
          adHoc: true,
          hasTimeField: true,
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const firstId = await pageObjects.discover.getCurrentDataViewId();
        await addRuntimeField(pageObjects, RUNTIME_FIELD, `emit(doc["bytes"].value.toString())`);
        await pageObjects.unifiedFieldList.clickFieldListItemAdd(RUNTIME_FIELD);

        const secondId = await pageObjects.discover.getCurrentDataViewId();
        expect(firstId).not.toBe(secondId);
      });

      await spaceTest.step('navigate to surrounding-docs view and back', async () => {
        await pageObjects.dataGrid.clickRowToggle({ rowIndex: 0 });
        await clickSurroundingDocuments(page);
        await expect(page).toHaveURL(/\/context\//, { timeout: 30_000 });

        await page.testSubj.click('~breadcrumb & ~first');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        expect(await pageObjects.dataViews.getSelectedName()).toBe('logstash*');
      });

      await spaceTest.step('navigate to single-doc view and back', async () => {
        await pageObjects.dataGrid.clickRowToggle({ rowIndex: 0 });
        await clickSingleDocument(page);
        await expect(page).toHaveURL(/\/doc\//, { timeout: 30_000 });

        await page.testSubj.click('~breadcrumb & ~first');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        expect(await pageObjects.dataViews.getSelectedName()).toBe('logstash*');
      });

      // Test 2: query and filtering on an ad-hoc data view.
      await spaceTest.step('filter by nestedField.child returns a single hit', async () => {
        await pageObjects.filterBar.addFilter({
          field: 'nestedField.child',
          operator: 'is',
          value: 'nestedValue',
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        expect(
          await pageObjects.filterBar.hasFilter({
            field: 'nestedField.child',
            value: 'nestedValue',
          })
        ).toBe(true);
        await expect(pageObjects.discover.hitCountLocator()).toHaveText('1', { timeout: 30_000 });

        await pageObjects.filterBar.removeFilter('nestedField.child');
        await pageObjects.discover.waitUntilSearchingHasFinished();
      });

      await spaceTest.step('query "test" returns 22 hits', async () => {
        await pageObjects.queryBar.setQuery('test');
        await pageObjects.queryBar.submitQuery();
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await expect(pageObjects.discover.hitCountLocator()).toHaveText('22', { timeout: 30_000 });

        await pageObjects.queryBar.clearQuery();
        await pageObjects.queryBar.submitQuery();
        await pageObjects.discover.waitUntilSearchingHasFinished();
      });

      // Test 3: saving an ad-hoc data view's saved search for the first
      // time keeps the data view id stable.
      await spaceTest.step('first-time save preserves data view id', async () => {
        const before = await pageObjects.discover.getCurrentDataViewId();
        await pageObjects.discover.saveSearch('logstash*-ss');
        const after = await pageObjects.discover.getCurrentDataViewId();
        expect(after).toBe(before);
      });

      // Test 4: "save as new copy" creates a new persisted data view and
      // therefore changes the id.
      await spaceTest.step('save-as-new flips data view id', async () => {
        const before = await pageObjects.discover.getCurrentDataViewId();
        await pageObjects.discover.saveSearch('logstash*-ss-new', true);
        const after = await pageObjects.discover.getCurrentDataViewId();
        expect(after).not.toBe(before);
      });

      // Test 5: editing a runtime field's value (delete + re-add with a
      // different script) flips the data view id; both saved searches
      // dropped onto a dashboard render the expected (different) values.
      await spaceTest.step('runtime-field re-define flips id and renders new values', async () => {
        await pageObjects.dataViews.createFromSearchBar({
          name: 'logst',
          adHoc: true,
          hasTimeField: true,
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        const beforeAdd = await pageObjects.discover.getCurrentDataViewId();

        await addRuntimeField(pageObjects, RUNTIME_FIELD, `emit(doc["bytes"].value.toString())`);
        await pageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
        await pageObjects.unifiedFieldList.clickFieldListItemAdd(RUNTIME_FIELD);
        const afterAdd = await pageObjects.discover.getCurrentDataViewId();
        expect(afterAdd).not.toBe(beforeAdd);

        await pageObjects.discover.saveSearch(`logst*-ss-${RUNTIME_FIELD}`);

        await pageObjects.unifiedFieldList.clickFieldListItemRemove(RUNTIME_FIELD);
        await removeRuntimeField(page, pageObjects, RUNTIME_FIELD);
        await pageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

        await addRuntimeField(
          pageObjects,
          RUNTIME_FIELD,
          `emit((doc["bytes"].value * 2).toString())`
        );
        await pageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
        await pageObjects.unifiedFieldList.clickFieldListItemAdd(RUNTIME_FIELD);

        await pageObjects.discover.saveSearch(`logst*-ss-${RUNTIME_FIELD}-updated`, true);
        await pageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

        // Drop both saved searches onto a fresh dashboard and read back the
        // first row of the runtime-field column. The "updated" definition
        // emits 2× the original, so cell-text-as-number should equal 2×
        // the first cell.
        await pageObjects.dataViewsFieldEditor.ensureModalIsClosed();
        await pageObjects.dashboard.openNewDashboard();
        await pageObjects.dashboard.addSavedSearch(`logst*-ss-${RUNTIME_FIELD}`);
        await pageObjects.dashboard.addSavedSearch(`logst*-ss-${RUNTIME_FIELD}-updated`);

        // The two grids share the same column id; the first cell of each
        // is what we compare.
        const cells = page.locator(
          `[data-test-subj="dataGridRowCell"][data-gridcell-column-id="${RUNTIME_FIELD}"][data-gridcell-visible-row-index="0"]`
        );
        await expect(cells).toHaveCount(2, { timeout: 30_000 });
        const cellTexts = await cells.allInnerTexts();
        const firstText = cellTexts[0].trim();
        const secondText = cellTexts[1].trim();
        expect(Number(secondText)).toBe(Number(firstText) * 2);
      });

      // Test 6: opening one of the embedded saved searches into context
      // resolves to that saved search by name.
      await spaceTest.step('open saved search via context from embeddable', async () => {
        // Any in-progress unsaved-changes modal triggers a `beforeunload`
        // confirm; auto-accept it so the navigation completes.
        page.on('dialog', (dialog) => {
          void dialog.accept();
        });

        await pageObjects.dataGrid.clickRowToggle({ rowIndex: 0 });
        await clickSurroundingDocuments(page);
        // Some flows raise an in-app confirm modal as well.
        const confirmButton = page.testSubj.locator('confirmModalConfirmButton');
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }
        await expect(page).toHaveURL(/\/context\//, { timeout: 30_000 });

        await page.testSubj.click('~breadcrumb & ~first');
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const savedSearchName = await page.testSubj.locator('~breadcrumb & ~last').textContent();
        expect(savedSearchName?.trim()).toBe(`logst*-ss-${RUNTIME_FIELD}`);

        const headerFields = await pageObjects.dataGrid.getHeaderFields();
        expect(headerFields.join(' ')).toContain(RUNTIME_FIELD);
      });

      // Test 7: editing a runtime field's name via the column-menu "Edit"
      // action mints a new ad-hoc data view id.
      await spaceTest.step('field rename flips data view id', async () => {
        await pageObjects.discover.loadSavedSearch(`logst*-ss-${RUNTIME_FIELD}`);
        await pageObjects.discover.waitUntilSearchingHasFinished();
        const before = await pageObjects.discover.getCurrentDataViewId();

        await pageObjects.dataGrid.clickEditField(RUNTIME_FIELD);
        await pageObjects.dataViewsFieldEditor.setName(`${RUNTIME_FIELD}-edited`, true);
        await pageObjects.dataViewsFieldEditor.save();
        await pageObjects.dataViewsFieldEditor.confirmSave();
        await pageObjects.dataViewsFieldEditor.waitUntilClosed();
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const after = await pageObjects.discover.getCurrentDataViewId();
        expect(after).not.toBe(before);
      });

      // Test 8: navigating back to a saved search whose data view id has
      // since changed surfaces two warning toasts (broken filter ref +
      // mismatched data view id).
      await spaceTest.step('invalid filter refs raise two toasts', async () => {
        await pageObjects.dataViews.createFromSearchBar({
          name: 'logstas',
          adHoc: true,
          hasTimeField: true,
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await pageObjects.filterBar.addFilter({
          field: 'nestedField.child',
          operator: 'is',
          value: 'nestedValue',
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.filterBar.addFilter({
          field: 'extension',
          operator: 'is',
          value: 'jpg',
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const first = await pageObjects.discover.getCurrentDataViewId();
        await addRuntimeField(
          pageObjects,
          RUNTIME_FIELD,
          `emit((doc["bytes"].value * 2).toString())`
        );
        const second = await pageObjects.discover.getCurrentDataViewId();
        expect(first).not.toBe(second);

        await pageObjects.toasts.dismissAll();
        await page.goBack();
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await expect
          .poll(() => pageObjects.toasts.getCount(), { timeout: 30_000 })
          .toBeGreaterThanOrEqual(2);
        const toastTexts = (await pageObjects.toasts.getAllText()).sort();
        expect(toastTexts).toStrictEqual(
          [
            `"${first}" is not a configured data view ID\nShowing the saved data view: "logstas*" (${second})`,
            `Different index references\nData view id references in some of the applied filters differ from the current data view.`,
          ].sort()
        );
      });
    }
  );
});
