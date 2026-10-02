/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '../../../..';
import { expect } from '../..';
import { type DataViewOptions } from './base';
import { DiscoverSave } from './save';

/** Data-view switcher, field editor, ES|QL controls, sidebar field list, and histogram. */
export abstract class DiscoverLayout extends DiscoverSave {
  // ── Data view switcher ─────────────────────────────────────────────────────

  protected async getVisibleDataViewSwitch() {
    const discoverSwitch = this.page.testSubj.locator('discover-dataView-switch-link');
    const fallbackSwitch = this.page.testSubj.locator('dataView-switch-link');

    // There should be exactly one visible data view switch.
    // If both are visible (bug), fail explicitly instead of picking one
    await this.page
      .locator(
        '[data-test-subj="discover-dataView-switch-link"], [data-test-subj="dataView-switch-link"]'
      )
      .waitFor({ state: 'visible' });

    const discoverVisible = await discoverSwitch.isVisible();
    const fallbackVisible = await fallbackSwitch.isVisible();

    if (discoverVisible === fallbackVisible) {
      throw new Error(
        `Expected exactly one data view switch link to be visible, but discover=${discoverVisible} fallback=${fallbackVisible}`
      );
    }

    return discoverVisible ? discoverSwitch : fallbackSwitch;
  }

  private async openDataViewSwitcher() {
    const dataViewSwitch = await this.getVisibleDataViewSwitch();
    await this.hideTabPreview();
    await dataViewSwitch.click();
  }

  protected async getDataViewSwitchName(dataViewSwitch: Locator): Promise<string> {
    return (await dataViewSwitch.getByTestId('fullText').innerText()).trim();
  }

  async selectDataView(
    name: string,
    {
      createAdHocIfMissing = true,
      waitForFieldList = true,
    }: { createAdHocIfMissing?: boolean; waitForFieldList?: boolean } = {}
  ) {
    const dataViewSwitch = await this.getVisibleDataViewSwitch();
    const currentValue = await this.getDataViewSwitchName(dataViewSwitch);
    if (currentValue === name) {
      return;
    }
    await this.hideTabPreview();
    await dataViewSwitch.click();
    const switcher = this.page.testSubj.locator('indexPattern-switcher');
    await switcher.waitFor({ state: 'visible' });
    await this.page.testSubj.typeWithDelay('indexPattern-switcher--input', name);
    const matchingDataViewLocator = switcher.locator(`[data-test-subj="dataView-${name}"]`);
    if (!createAdHocIfMissing) {
      // Let Playwright wait for the filtered option to render instead of checking visibility
      // immediately after the final keystroke.
      await matchingDataViewLocator.click();
    } else if (await matchingDataViewLocator.isVisible()) {
      await matchingDataViewLocator.click();
    } else {
      await this.page.testSubj.locator('explore-matching-indices-button').click();
    }
    await switcher.waitFor({ state: 'hidden' });
    if (waitForFieldList) {
      await this.waitUntilFieldListHasCountOfFields();
    }
  }

  getSelectedDataView(): Locator {
    return this.page.testSubj
      .locator('discover-dataView-switch-link')
      .or(this.page.testSubj.locator('dataView-switch-link'));
  }

  private async fillAndSubmitDataViewEditor({
    name,
    adHoc = false,
    waitUntilLoaded = true,
  }: DataViewOptions) {
    // Minimal inline interaction with the data view editor flyout. The full
    // `DataViewEditorPage` object lives in the `data_view_editor` plugin, but
    // `kbn-scout` is a base package and must not depend on a plugin, so the few
    // steps Discover needs are driven directly here.
    const flyout = this.page.testSubj.locator('indexPatternEditorFlyout');
    const form = this.page.testSubj.locator('indexPatternEditorForm');
    const titleInput = this.page.testSubj.locator('createIndexPatternTitleInput');
    const timestampField = this.page.testSubj.locator('timestampField');

    await flyout.waitFor({ state: 'visible' });

    // FTR passes the base name and relies on the editor auto-appending `*` as the
    // user types. Scout sets the title verbatim (`fill`), so append the wildcard
    // here to preserve that contract (`name`, `* will be added automatically`).
    const title = name.endsWith('*') ? name : `${name}*`;
    const timestampCombo = this.page.components.comboBox('timestampField');

    await titleInput.waitFor({ state: 'visible', timeout: 30_000 });

    await expect(async () => {
      await titleInput.fill('');
      await titleInput.fill(title);
      // wait for async title validation to settle before continuing.
      await form
        .and(this.page.locator('[data-validation-error="0"]'))
        .waitFor({ state: 'visible' });

      // Wait for an actual selection rather than only `data-is-loading="0"`: that is also the
      // field's initial state, so on its own it cannot tell "options loaded" apart from
      // "loading has not started". Submitting too early still passes validation, but creates
      // the data view with no time field, so no time filter is applied and hit counts include
      // documents outside the selected range.
      await expect
        .poll(
          async () => {
            const isLoading = await timestampField.getAttribute('data-is-loading');
            if (isLoading !== '0') {
              return false;
            }
            return (await timestampCombo.getSelectedOptions()).length > 0;
          },
          { timeout: 15_000, intervals: [200] }
        )
        .toBe(true);

      await this.page.testSubj.click(
        adHoc ? 'exploreIndexPatternButton' : 'saveIndexPatternButton'
      );

      await expect(this.getSelectedDataView()).toHaveAccessibleName(title, { timeout: 20_000 });
    }).toPass({ timeout: 45_000, intervals: [0] });

    // New empty tabs stay uninitialized after a data-view change; the caller knows
    // that and should pass `waitUntilLoaded: false` instead of probing the prompt.
    if (waitUntilLoaded) {
      await this.waitUntilTabIsLoaded();
    }
  }

  /**
   * Creates a new data view from the Discover search bar data-view switcher
   * (classic mode only). The editor appends `*` to the title automatically.
   */
  async createDataViewFromSearchBar(options: DataViewOptions) {
    await this.openDataViewSwitcher();
    await this.page.testSubj.click('dataview-create-new');
    await this.fillAndSubmitDataViewEditor(options);
  }

  async createDataViewFromNoDataPrompt(options: DataViewOptions) {
    await this.page.testSubj.click('createDataViewButton');
    await this.fillAndSubmitDataViewEditor(options);
  }

  async getAvailableDataViewsFromSearchBar(): Promise<string[]> {
    await this.openDataViewSwitcher();
    const switcher = this.page.testSubj.locator('indexPattern-switcher');
    await switcher.waitFor({ state: 'visible' });

    const dataViews = await switcher
      .locator('.euiSelectableListItem[data-test-subj^="dataView-"]')
      .evaluateAll((items) =>
        items
          .map((item) => item.getAttribute('data-test-subj')?.slice('dataView-'.length))
          .filter((name): name is string => Boolean(name))
      );

    await this.page.keyboard.press('Escape');
    await switcher.waitFor({ state: 'hidden' });

    return dataViews;
  }

  async isCurrentDataViewAdHoc(): Promise<boolean> {
    const dataViewTitle = await this.getDataViewSwitchName(await this.getVisibleDataViewSwitch());

    await this.openDataViewSwitcher();
    const switcher = this.page.testSubj.locator('indexPattern-switcher');
    await switcher.waitFor({ state: 'visible' });
    const isAdHoc = await this.page.testSubj
      .locator(`dataViewItemTempBadge-${dataViewTitle}`)
      .isVisible();
    await this.page.keyboard.press('Escape');
    await switcher.waitFor({ state: 'hidden' });

    return isAdHoc;
  }

  async editCurrentDataViewName(
    name: string,
    { withConfirmation = false }: { withConfirmation?: boolean } = {}
  ) {
    await this.openDataViewSwitcher();
    await this.page.testSubj.click('indexPattern-manage-field');
    const flyout = this.page.testSubj.locator('indexPatternEditorFlyout');
    await flyout.waitFor({ state: 'visible' });
    const nameInput = this.page.testSubj.locator('createIndexPatternNameInput');
    await nameInput.fill(name);
    await expect(nameInput).toHaveValue(name);
    await this.page.testSubj.click('saveIndexPatternButton');
    if (withConfirmation) {
      const confirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
      await confirmButton.waitFor({ state: 'visible' });
      await confirmButton.click();
    }
    await flyout.waitFor({ state: 'hidden', timeout: 30_000 });
    await this.waitUntilTabIsLoaded();
  }

  async editDataViewFromSearchBar({
    newIndexPattern,
    newTimeField,
  }: {
    newIndexPattern?: string;
    newTimeField?: string;
  }) {
    await this.openDataViewSwitcher();
    await this.page.testSubj.click('indexPattern-manage-field');

    const flyout = this.page.testSubj.locator('indexPatternEditorFlyout');
    await flyout.waitFor({ state: 'visible' });

    if (newIndexPattern) {
      const titleInput = this.page.testSubj.locator('createIndexPatternTitleInput');
      await titleInput.fill(newIndexPattern);
      const form = this.page.testSubj.locator('indexPatternEditorForm');
      await form
        .and(this.page.locator('[data-validation-error="0"]'))
        .waitFor({ state: 'visible' });
    }

    if (newTimeField) {
      const timestampField = this.page.testSubj.locator('timestampField');
      await timestampField
        .and(this.page.locator('[data-is-loading="0"]'))
        .waitFor({ state: 'visible', timeout: 30_000 });
      await this.page.components.comboBox('timestampField').setSelectedOptions([newTimeField]);
    }

    await this.page.testSubj.click('saveIndexPatternButton');

    const confirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
    const confirmVisible = await confirmButton
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (confirmVisible) {
      await confirmButton.click();
    }

    await flyout.waitFor({ state: 'hidden', timeout: 30_000 });
    await this.waitUntilTabIsLoaded();
  }


  /** Opens the field editor from the sidebar's "Add a field" button, which is gated on `canEditDataView`. */
  // ── Runtime field / field editor helpers ──────────────────────────────────

  async openAddFieldEditorFromSidebar() {
    await this.page.testSubj.click('dataView-add-field_btn');
    await this.page.testSubj.locator('fieldEditor').waitFor({ state: 'visible' });
  }

  async createRuntimeField({
    fieldName,
    script,
    popularity,
  }: {
    fieldName: string;
    script: string;
    popularity?: number;
  }) {
    await this.openDataViewSwitcher();
    await this.page.testSubj.click('indexPattern-add-field');
    const fieldEditor = this.page.getByRole('dialog', { name: 'Create field' });
    await fieldEditor.waitFor({ state: 'visible' });

    await fieldEditor.getByRole('textbox', { name: 'Name field' }).fill(fieldName);
    await fieldEditor.getByRole('switch', { name: 'Set value' }).click();
    await fieldEditor
      .getByRole('textbox', { name: /Editor content/ })
      .waitFor({ state: 'visible' });
    await this.codeEditor.setCodeEditorValue(script);

    if (typeof popularity === 'number') {
      await this.setPopularity(popularity);
    }

    await fieldEditor.getByRole('button', { name: 'Save' }).click();
    await fieldEditor.waitFor({ state: 'hidden' });
    await this.waitUntilTabIsLoaded();
  }

  async getCurrentDataViewId(): Promise<string> {
    const currentUrl = this.page.url();
    const matches = [...currentUrl.matchAll(/dataViewId:[^,]*/g)];
    const ids = matches.map(([m]) =>
      decodeURIComponent(m).replace('dataViewId:', '').replaceAll("'", '')
    );
    if (!ids.length) {
      throw new Error(
        `Discover URL state doesn't contain a dataViewId reference. URL: ${currentUrl}`
      );
    }
    const first = ids[0];
    if (!ids.every((id) => id === first)) {
      throw new Error('Discover URL state contains different dataViewId references.');
    }
    return first;
  }

  async deleteRuntimeField(fieldName: string) {
    // The field may appear in multiple sidebar sections (Popular + Available);
    // scope to Available fields to avoid strict-mode violations.
    const fieldItem = this.page.testSubj
      .locator('fieldListGroupedAvailableFields')
      .locator(`[data-test-subj="field-${fieldName}"]`);
    await fieldItem.waitFor({ state: 'visible' });
    await fieldItem.click();
    await this.page.locator('[data-popover-open="true"]').waitFor({ state: 'visible' });
    await this.page.testSubj.click(`discoverFieldListPanelDelete-${fieldName}`);
    const confirmModal = this.page.testSubj.locator('runtimeFieldDeleteConfirmModal');
    await confirmModal.waitFor({ state: 'visible' });
    await this.page.testSubj.typeWithDelay('deleteModalConfirmText', 'remove');
    await this.page.testSubj.click('confirmModalConfirmButton');
    await confirmModal.waitFor({ state: 'hidden' });
    await this.waitUntilTabIsLoaded();
  }

  async renameRuntimeField(newFieldName: string) {
    const fieldEditor = this.page.getByRole('dialog', { name: /Edit .* field/ });
    await fieldEditor.waitFor({ state: 'visible' });

    await fieldEditor.getByRole('textbox', { name: 'Name field' }).fill(newFieldName);
    await this.page.testSubj.click('fieldSaveButton');
    await this.page.testSubj.fill('saveModalConfirmText', 'change');
    await this.page.testSubj.click('confirmModalConfirmButton');
    await fieldEditor.waitFor({ state: 'hidden' });
    await this.waitUntilTabIsLoaded();
  }

  async setPopularity(popularity: number) {
    await this.page.testSubj.click('toggleAdvancedSetting');
    const row = this.page.testSubj.locator('popularityRow');
    await row.locator('[data-test-subj="toggle"]').click();
    await this.page.testSubj.locator('editorFieldCount').fill(String(popularity));
  }

  async setCustomLabel(label: string, { enableToggle = false }: { enableToggle?: boolean } = {}) {
    const row = this.page.testSubj.locator('customLabelRow');
    await row.waitFor({ state: 'visible' });
    if (enableToggle) {
      await row.locator('[data-test-subj="toggle"]').click();
    }
    const input = row.locator('input');
    await input.waitFor({ state: 'visible' });
    await input.fill(label);
  }

  async setCustomDescription(
    description: string,
    { enableToggle = false }: { enableToggle?: boolean } = {}
  ) {
    const row = this.page.testSubj.locator('customDescriptionRow');
    await row.waitFor({ state: 'visible' });
    if (enableToggle) {
      await row.locator('[data-test-subj="toggle"]').click();
    }
    const input = row.locator('textarea, input');
    await input.fill(description);
  }

  getCustomDescriptionFormError(): Locator {
    return this.page.testSubj.locator('customDescriptionRow').locator('.euiFormErrorText');
  }

  async saveOpenFieldEditor({ confirmChange = false }: { confirmChange?: boolean } = {}) {
    const fieldEditor = this.page.testSubj.locator('fieldEditor');
    await fieldEditor.waitFor({ state: 'visible' });
    await this.page.testSubj.click('fieldSaveButton');
    if (confirmChange) {
      const confirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
      await this.page.testSubj.fill('saveModalConfirmText', 'change');
      await confirmButton.waitFor({ state: 'visible' });
      await confirmButton.click();
    }
    await fieldEditor.waitFor({ state: 'hidden' });
    await this.waitUntilTabIsLoaded();
  }

  async discardOpenFieldEditorChanges() {
    const fieldEditor = this.page.testSubj.locator('fieldEditor');
    await fieldEditor.waitFor({ state: 'visible' });
    await this.page.testSubj.click('closeFlyoutButton');
    const confirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
    await confirmButton.click();
    await fieldEditor.waitFor({ state: 'hidden' });
  }


  /**
   * Creates an ES|QL control from the editor: types a query ending in a variable position,
   * picks "Create control" from the suggestion widget and saves the flyout. Returns once
   * the control group is rendered.
   */
  // ── ES|QL controls ────────────────────────────────────────────────────────

  async createEsqlControl(
    query: string,
    {
      variableName,
      label,
      values,
    }: { variableName?: string; label?: string; values?: string[] } = {}
  ) {
    // Monaco registers its text model only once the editor has mounted, and the ES|QL
    // editor can still be mounting after the tab reports loaded, for instance right after
    // adding a new Discover panel. Setting a value or triggering suggestions before then
    // has no model to act on.
    await this.codeEditor.waitCodeEditorReady('ESQLEditor');
    await this.codeEditor.setCodeEditorValue(query);
    await this.codeEditor.triggerSuggest(query);

    const suggestionWidget = this.codeEditor.getCodeEditorSuggestWidget();
    await suggestionWidget.waitFor({ state: 'visible' });
    await suggestionWidget.locator('.monaco-list-row', { hasText: 'Create control' }).click();

    const flyout = this.page.testSubj.locator('create_esql_control_flyout');
    await flyout.waitFor({ state: 'visible' });

    if (variableName !== undefined) {
      await this.page.testSubj.fill('esqlVariableName', variableName);
    }
    if (label !== undefined) {
      await this.page.testSubj.fill('esqlControlLabel', label);
    }
    if (values) {
      await this.page.testSubj.locator('esqlControlTypeDropdown').click();
      await this.page.testSubj.locator('staticValues').click();
      const valuesComboBox = this.page.components.comboBox('esqlValuesOptions');
      for (const value of values) {
        await valuesComboBox.setCustomSelectedOptions([value]);
      }
    }

    // Save stays disabled until `available_options` is populated (see `formIsInvalid` in
    // esql/public/triggers/esql_controls/control_flyout/index.tsx), and the click waits for
    // it to become enabled. That means waiting on the control's own ES|QL query rather than
    // on rendering, so query latency sets the budget.
    await this.page.testSubj.locator('saveEsqlControlsFlyoutButton').click({ timeout: 30_000 });
    await flyout.waitFor({ state: 'hidden' });
    await this.page.testSubj.locator('controls-group-wrapper').waitFor({ state: 'visible' });
  }


  // ── Sidebar ───────────────────────────────────────────────────────────────

  async waitUntilFieldListHasCountOfFields() {
    await this.page.testSubj.waitForSelector('fieldListGroupedAvailableFields-countLoading', {
      state: 'hidden',
    });
  }

  /**
   * Returns the number of fields shown in the sidebar "Available fields" group.
   */
  async getSidebarAvailableFieldCount(): Promise<number> {
    await this.waitUntilFieldListHasCountOfFields();
    const count = await this.page.testSubj.innerText('fieldListGroupedAvailableFields-count');
    return Number(count);
  }

  /**
   * Filters the sidebar field list by the given search term.
   */
  async searchFieldInSidebar(name: string) {
    await this.page.testSubj.fill('fieldListFiltersFieldSearch', name);
  }

  /**
   * Assert that the "Selected fields" sidebar group contains exactly the
   * fields named in `expected` — no more, no less. Useful for verifying ES|QL
   * `KEEP` clauses or any explicit column-selection flow.
   */
  async expectSelectedSidebarFieldsToEqual(expected: readonly string[]) {
    await this.waitUntilFieldListHasCountOfFields();
    const selectedFields = this.page.testSubj.locator('fieldListGroupedSelectedFields');
    await expect(selectedFields).toBeVisible();

    const entries = selectedFields.getByTestId(/^dscFieldListPanelField-/);
    await expect(entries).toHaveCount(expected.length);

    for (const field of expected) {
      await expect(selectedFields.getByTestId(`dscFieldListPanelField-${field}`)).toBeVisible();
    }
  }

  private async waitUntilFieldPopoverIsLoaded() {
    await this.page.locator('[data-popover-open="true"]').waitFor({ state: 'visible' });
    await expect(this.page.locator('[data-test-subj*="-statsLoading"]')).toBeHidden();
  }

  async addBreakdownFieldFromSidebar(
    field: string,
    section: 'selected' | 'available' = 'available'
  ) {
    const sidebarToggleButton = this.page.testSubj.locator('discover-sidebar-fields-button');
    if (await sidebarToggleButton.isVisible()) {
      await sidebarToggleButton.click();
    }

    await this.waitUntilFieldListHasCountOfFields();

    const sectionTestSubj =
      section === 'selected' ? 'fieldListGroupedSelectedFields' : 'fieldListGroupedAvailableFields';
    const fieldLocator = this.page.testSubj
      .locator(sectionTestSubj)
      .locator(`[data-test-subj="field-${field}"]`);
    await fieldLocator.hover();
    await fieldLocator.click();
    await this.waitUntilFieldPopoverIsLoaded();

    await this.page.testSubj.locator(`fieldPopoverHeader_addBreakdownField-${field}`).click();
    await this.waitUntilSearchingHasFinished();
  }


  // ── Histogram ─────────────────────────────────────────────────────────────

  async waitForHistogramRendered() {
    await this.page.testSubj.waitForSelector('unifiedHistogramRendered');
  }

  /**
   * Returns the rendered height (rounded to whole pixels) of the fixed histogram panel
   * Rounding avoids sub-pixel noise so callers can assert exact resize deltas.
   */
  async getHistogramHeight(): Promise<number> {
    const histogram = this.page.testSubj.locator('unifiedHistogramResizablePanelFixed');
    await histogram.waitFor();
    const box = await histogram.boundingBox();
    if (!box) {
      throw new Error('Could not read the histogram panel bounding box');
    }
    return Math.round(box.height);
  }

  /**
   * Drags the histogram resize handle vertically by `distance` pixels (positive
   * grows the histogram).
   * Neither Scout nor Playwright has a drag-by-offset helper (Scout's
   * `testSubj.dragTo` only drags element-to-element), so we drive the mouse
   * manually.
   */
  async resizeHistogramBy(distance: number) {
    const resizeButton = this.page.testSubj.locator('unifiedHistogramResizableButton');
    await resizeButton.waitFor();
    const box = await resizeButton.boundingBox();
    if (!box) {
      throw new Error('Could not read the histogram resize handle bounding box');
    }
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX, startY + distance, { steps: 10 });
    await this.page.mouse.up();
  }

  getHistogramChart(): Locator {
    return this.page.testSubj.locator('unifiedHistogramChart');
  }

  async getChartTimespan(): Promise<string> {
    // Wait until the attribute no longer contains "Loading"
    const element = this.getHistogramChart();
    await expect(element).not.toHaveAttribute('data-time-range', /Loading/);

    return (await element.getAttribute('data-time-range')) ?? '';
  }

  async getHistogramSuggestionType(): Promise<string | null> {
    const chart = this.page.testSubj.locator('unifiedHistogramChart');
    await chart.waitFor({ state: 'visible' });
    return chart.getAttribute('data-suggestion-type');
  }

  async clickHistogramBar() {
    const canvas = this.page.locator('[data-test-subj="unifiedHistogramChart"] canvas');
    // Click at the center of the canvas
    await canvas.click();
  }

  /**
   * Brushes a short range on the histogram canvas. Offsets match the FTR
   * `brushHistogram` gesture so the selected window stays comparable.
   */
  async brushHistogram() {
    const canvas = this.page.locator('[data-test-subj="unifiedHistogramChart"] canvas');
    await canvas.waitFor({ state: 'visible' });
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Could not read the histogram canvas bounding box');
    }
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    await this.page.mouse.move(centerX - 300, centerY + 20);
    await this.page.mouse.down();
    await this.page.mouse.move(centerX - 100, centerY + 30, { steps: 10 });
    await this.page.mouse.up();
  }

  async getHistogramLegendLabels(): Promise<string[]> {
    const labels = this.getHistogramChart().locator('.echLegendItem__label');
    return (await labels.allInnerTexts()).map((text) => text.trim()).filter(Boolean);
  }

  async clickLegendFilter(field: string, type: '+' | '-') {
    const filterType = type === '+' ? 'filterIn' : 'filterOut';
    await this.page.testSubj.click(`legend-${field}`);
    await this.page.testSubj.click(`legend-${field}-${filterType}`);
  }

  getChartIntervalWarningIcon(): Locator {
    return this.page.testSubj.locator('unifiedHistogramIntervalWarning');
  }

  async getChartInterval(): Promise<string> {
    const button = this.page.testSubj.locator('unifiedHistogramTimeIntervalSelectorButton');
    return (await button.getAttribute('data-selected-value')) || '';
  }

  /** Opens the histogram's interval selector popover without picking an option. */
  async openChartIntervalSelector() {
    await this.page.testSubj.click('unifiedHistogramTimeIntervalSelectorButton');
    await this.page.testSubj.waitForSelector('unifiedHistogramTimeIntervalSelectorSelectable', {
      state: 'visible',
    });
  }

  /**
   * Pick a histogram chart interval (e.g. `"Day"`).
   */
  async setChartInterval(intervalTitle: string) {
    await this.openChartIntervalSelector();
    await this.page
      .locator(
        `[data-test-subj="unifiedHistogramTimeIntervalSelectorSelectable"] .euiSelectableListItem span[title="${intervalTitle}"]`
      )
      .click();
    await this.page.testSubj.waitForSelector('unifiedHistogramTimeIntervalSelectorSelectable', {
      state: 'hidden',
    });
  }

  /**
   * Click the histogram breakdown selector and pick `field` (or `"No breakdown"`).
   * `value` is the selectable item value when it differs from the visible label.
   */
  async chooseBreakdownField(field: string, value = field) {
    const selectable = this.page.testSubj.locator('unifiedHistogramBreakdownSelectorSelectable');
    await this.page.testSubj.click('unifiedHistogramBreakdownSelectorButton');
    await selectable.waitFor({ state: 'visible' });
    await this.page.testSubj.fill('unifiedHistogramBreakdownSelectorSelectorSearch', field);
    // The list is virtualised; clicking while EUI is still filtering misses the option
    // and leaves the popover open.
    await selectable.and(this.page.locator('[data-is-searching="false"]')).waitFor({
      state: 'attached',
    });
    await selectable.locator(`.euiSelectableListItem[value="${value}"]`).click();
    await selectable.waitFor({ state: 'hidden' });
  }

  /**
   * Returns the label currently shown on the histogram breakdown selector button
   * (e.g. `"Breakdown by geo.src"` or `"No breakdown"`.
   */
  async getBreakdownFieldValue(): Promise<string> {
    const visibleText = await this.page.testSubj.innerText(
      'unifiedHistogramBreakdownSelectorButton'
    );

    // The button label truncates long field names via an absolutely positioned
    // overlay, which the browser's visible-text computation renders as if it
    // were on its own line. Collapse that whitespace since it isn't visible on screen.
    return visibleText.replace(/\s+/g, ' ').trim();
  }

  /**
   * Clears the histogram breakdown field by selecting the "No breakdown" option.
   */
  async clearBreakdownField() {
    await this.chooseBreakdownField('No breakdown', '__EMPTY_SELECTOR_OPTION__');
  }

  async showChart() {
    const showButton = this.page.testSubj.locator('dscShowHistogramButton');
    const hideButton = this.page.testSubj.locator('dscHideHistogramButton');
    // The toggle renders as exactly one of these; wait for it to mount before
    // probing so a slow post-navigation render can't make the guard silently no-op.
    await expect(showButton.or(hideButton)).toBeVisible();
    if (await showButton.isVisible()) {
      await showButton.click();
      await expect(this.getHistogramChart()).toBeVisible();
    }
  }

  async hideChart() {
    const showButton = this.page.testSubj.locator('dscShowHistogramButton');
    const hideButton = this.page.testSubj.locator('dscHideHistogramButton');
    await expect(showButton.or(hideButton)).toBeVisible();
    if (await hideButton.isVisible()) {
      await hideButton.click();
      await expect(this.getHistogramChart()).toBeHidden();
    }
  }

  async navigateToLensEditor() {
    await this.page.testSubj.click('unifiedHistogramEditVisualization');
  }

  async openLensEditFlyout() {
    await this.page.testSubj.locator('unifiedHistogramEditFlyoutVisualization').click();
    await this.getLensEditFlyout().waitFor({ state: 'visible' });
  }

  async changeVisualizationShape(seriesType: string) {
    await this.openLensEditFlyout();
    const chartSwitch = this.page.testSubj.locator('lnsChartSwitchPopover');
    await chartSwitch.click();
    await this.page.testSubj.fill('lnsChartSwitchSearch', seriesType);
    await this.page.testSubj.locator(`lnsChartSwitchPopover_${seriesType.toLowerCase()}`).click();
    await chartSwitch.getByText(seriesType, { exact: true }).waitFor({ state: 'visible' });
    await this.page.testSubj.locator('applyFlyoutButton').scrollIntoViewIfNeeded();
    await this.page.testSubj.click('applyFlyoutButton');
    await this.page.testSubj.locator('customizeLens').waitFor({ state: 'hidden' });
    await this.waitUntilSearchingHasFinished();
  }

  async chooseVisualizationSuggestion(suggestionType: string) {
    await this.openLensEditFlyout();
    await this.page.testSubj.click('lensSuggestionsPanelToggleButton');
    const suggestion = this.page.testSubj.locator(`lnsSuggestion-${suggestionType}`);
    await suggestion.waitFor({ state: 'visible' });
    await suggestion.click();
    await suggestion
      .locator('[data-test-subj="lnsSuggestion"]')
      .and(this.page.locator('[aria-current="true"]'))
      .waitFor({ state: 'visible' });
    await this.page.testSubj.locator('applyFlyoutButton').scrollIntoViewIfNeeded();
    await this.page.testSubj.click('applyFlyoutButton');
    await this.waitUntilSearchingHasFinished();
  }

  async getVisualizationTitle(): Promise<string> {
    await this.openLensEditFlyout();
    const title = await this.page.testSubj.innerText('lnsChartSwitchPopover');
    await this.page.testSubj.click('cancelFlyoutButton');
    return title;
  }

  getLensEditFlyout(): Locator {
    return this.page.testSubj.locator('lnsChartSwitchPopover');
  }

  async expectXYVisChartVisible() {
    await expect(this.page.testSubj.locator('xyVisChart')).toBeVisible();
  }


  // ── Document table ────────────────────────────────────────────────────────

  getHitCountLocator(): Locator {
    return this.page.testSubj.locator('discoverQueryHits');
  }

  async getHitCountInt(): Promise<number> {
    const hitCount = await this.getHitCountLocator().innerText();
    return parseInt(hitCount.replace(/,/g, ''), 10);
  }
}
