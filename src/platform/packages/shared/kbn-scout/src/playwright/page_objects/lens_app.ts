/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';
import { expect } from '..';

/** Internal field id of Lens's "Records" pseudo-field (`DOCUMENT_FIELD_NAME` in the Lens plugin). */
const RECORDS_FIELD_ID = '___records___';

const normalizeComputedColor = (color: string | undefined): string | undefined => {
  if (!color) {
    return undefined;
  }

  const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, 1)`;
  }

  return color;
};

export class LensApp {
  private readonly lensApp;
  private readonly chartSwitchPopover;
  private readonly chartSwitchList;
  private readonly saveAndReturnButton;
  private readonly saveButton;
  private readonly saveModal;
  private readonly savedObjectTitleInput;
  private readonly confirmSaveButton;
  private readonly closeDimensionEditorButton;
  private readonly goBackToAppButton;
  private readonly discardChangesModal;
  private readonly confirmModalConfirmButton;
  private readonly settingsButton;
  private readonly settingsMenu;
  private readonly autoApplyToggle;
  private readonly emptyWorkspacePrompt;
  private readonly workspaceApplyChangesPrompt;
  private readonly formulaTab;
  private readonly formulaEditorInput;
  private readonly formulaFullscreenButton;
  private readonly layerAddButton;
  private readonly referenceLineFillBelowButton;
  private readonly legacyMetricValue;
  private readonly metricTilesLocator;
  private readonly secondaryMetricBadge;
  private readonly secondaryMetricLabel;
  private readonly layerTabsLocator;

  constructor(private readonly page: ScoutPage) {
    this.lensApp = this.page.testSubj.locator('lnsApp');
    this.chartSwitchPopover = this.page.testSubj.locator('lnsChartSwitchPopover');
    this.chartSwitchList = this.page.testSubj.locator('lnsChartSwitchList');
    this.saveAndReturnButton = this.page.testSubj.locator('lnsApp_saveAndReturnButton');
    this.saveButton = this.page.testSubj.locator('lnsApp_saveButton');
    this.saveModal = this.page.testSubj.locator('savedObjectSaveModal');
    this.savedObjectTitleInput = this.page.testSubj.locator('savedObjectTitle');
    this.confirmSaveButton = this.page.testSubj.locator('confirmSaveSavedObjectButton');
    this.closeDimensionEditorButton = this.page.testSubj.locator(
      'lns-indexPattern-dimensionContainerClose'
    );
    this.goBackToAppButton = this.page.testSubj.locator('lnsApp_goBackToAppButton');
    this.discardChangesModal = this.page.testSubj.locator('lnsApp_discardChangesModalOrigin');
    this.confirmModalConfirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
    this.settingsButton = this.page.testSubj.locator('lnsApp_settingsButton');
    this.settingsMenu = this.page.testSubj.locator('lnsApp__settingsMenu');
    this.autoApplyToggle = this.page.testSubj.locator('lnsToggleAutoApply');
    this.emptyWorkspacePrompt = this.page.testSubj.locator('workspace-drag-drop-prompt');
    this.workspaceApplyChangesPrompt = this.page.testSubj.locator('workspace-apply-changes-prompt');
    this.formulaTab = this.page.testSubj.locator('lens-dimensionTabs-formula');
    // Scoped to `.lnsFormula` (the formula tab's own wrapper) rather than the
    // `lnsFormulaWidget` test subject, which is Monaco's overflow-widget host
    // (appended directly to `document.body` for autocomplete popups) and is
    // unrelated to whether the formula editor itself is visible.
    this.formulaEditorInput = this.page.locator('.lnsFormula .monaco-editor');
    this.formulaFullscreenButton = this.page.testSubj.locator('lnsFormula-fullscreen');
    this.layerAddButton = this.page.testSubj.locator('lnsLayerAddButton');
    this.referenceLineFillBelowButton = this.page.testSubj.locator('lnsXY_fill_below');
    this.legacyMetricValue = this.page.testSubj.locator('metric_value');
    // Elastic Charts pads the last grid row with empty filler cells (`role="presentation"`,
    // no title/value) to keep tile sizing consistent; excluded since they aren't real metrics.
    this.metricTilesLocator = this.page.locator(
      '[data-test-subj="mtrVis"] .echChart li:not([role="presentation"])'
    );
    this.secondaryMetricBadge = this.page.locator('.echBadge__content');
    this.secondaryMetricLabel = this.page.locator('.echSecondaryMetric__label');
    // Tab `data-test-subj` values use layer ids (not numeric indices); this only ever
    // resolves to elements when there are 2+ layers (EUI hides the tab strip for one).
    this.layerTabsLocator = this.page.locator('[data-test-subj^="unifiedTabs_tab_"]');
  }

  async waitForLensApp() {
    await this.lensApp.waitFor({ state: 'visible' });
  }

  async openFullEditor() {
    await this.page.gotoApp('lens');
    await this.waitForLensApp();
  }

  /**
   * Switches the active visualization via the chart switcher.
   *
   * @param visType Chart switcher test-subj suffix (e.g. `lnsMetric`, `bar`), not the display label.
   * @param options.search Optional filter text when the target chart is easier to find by label.
   */
  async switchToVisualization(visType: string, options?: { search?: string }) {
    await this.openChartSwitchPopover();
    if (options?.search) {
      const searchInput = this.page.testSubj.locator('lnsChartSwitchSearch');
      await searchInput.waitFor({ state: 'visible' });
      await searchInput.fill(options.search);
    }
    const option = this.chartSwitchList.getByTestId(`lnsChartSwitchPopover_${visType}`);
    await option.waitFor({ state: 'visible' });
    await option.click();
    // Popover should close after selection; waiting avoids racing with subsequent assertions.
    await this.chartSwitchList.waitFor({ state: 'hidden' });
  }

  async applyFlyoutChanges() {
    const applyFlyoutButton = this.getApplyFlyoutButton();
    await applyFlyoutButton.scrollIntoViewIfNeeded();
    await applyFlyoutButton.click();
    await this.page.testSubj.locator('lnsWorkspace').waitFor({ state: 'hidden' });
  }

  async cancelFlyoutChanges() {
    await this.getCancelFlyoutButton().click();
    await this.page.testSubj.locator('lnsWorkspace').waitFor({ state: 'hidden' });
  }

  /** Locator for the "Apply changes" button rendered in the given area. */
  getApplyChangesButton(target: 'toolbar' | 'suggestions' | 'workspace') {
    return this.page.testSubj.locator(`lnsApplyChanges__${target}`);
  }

  /** Clicks the "Apply changes" button in the given area and waits for it to disappear. */
  async applyChanges(target: 'toolbar' | 'suggestions' | 'workspace') {
    const button = this.getApplyChangesButton(target);
    await button.click();
    await button.waitFor({ state: 'hidden' });
  }

  /**
   * Clicks "Save and return" and waits for Lens to close and the dashboard
   * viewport to be visible.
   */
  async saveAndReturn() {
    await this.saveAndReturnButton.waitFor({ state: 'visible' });
    await this.saveAndReturnButton.click();
    await expect(this.lensApp).toBeHidden();
    await this.page.testSubj.locator('dshDashboardViewport').waitFor({ state: 'visible' });
  }

  async goBackToPreviousApp() {
    await this.goBackToAppButton.click();
  }

  getDiscardChangesModal() {
    return this.discardChangesModal;
  }

  async confirmDiscardChangesModal() {
    await this.discardChangesModal.waitFor({ state: 'visible' });
    await this.confirmModalConfirmButton.click();
    await this.discardChangesModal.waitFor({ state: 'hidden' });
  }

  /**
   * Opens the Lens save modal, fills in the title, optionally selects
   * a dashboard target, and confirms. Waits for the modal to close.
   */
  async save(
    title: string,
    options?:
      | {
          addToDashboard: 'existing';
          dashboardTitle: string;
        }
      | {
          addToDashboard: 'new';
        }
      | {
          addToDashboard: 'none';
        }
  ) {
    await this.saveButton.click();
    await this.saveModal.waitFor({ state: 'visible' });
    await this.savedObjectTitleInput.fill(title);

    if (options?.addToDashboard === 'existing') {
      await this.page.locator('label[for="existing-dashboard-option"]').click();
      await this.page.testSubj.locator('open-dashboard-picker').click();
      await this.page.testSubj
        .locator(`dashboard-picker-option-${options.dashboardTitle.split(' ').join('-')}`)
        .click();
    } else if (options?.addToDashboard === 'new') {
      await this.page.locator('label[for="new-dashboard-option"]').click();
    } else if (options?.addToDashboard === 'none') {
      await this.page.locator('label[for="add-to-library-option"]').click();
    }

    await this.confirmSaveButton.click();
    await this.saveModal.waitFor({ state: 'hidden' });
  }

  async configureXYDimensions(options?: {
    y?: { operation: string; field?: string };
    x?: { operation: string; field?: string };
    split?: {
      operation: string;
      field?: string;
      palette?: { mode: 'legacy' | 'colorMapping'; id: string };
    };
  }) {
    const y = options?.y ?? { operation: 'average', field: 'bytes' };
    const x = options?.x ?? { operation: 'date_histogram', field: '@timestamp' };
    const split = options?.split ?? { operation: 'terms', field: 'ip' };

    await this.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: y.operation,
      field: y.field,
    });
    await this.configureDimension({
      dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
      operation: x.operation,
      field: x.field,
    });
    await this.configureDimension({
      dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
      operation: split.operation,
      field: split.field,
      palette: split.palette,
    });
  }

  async configureDimension(opts: {
    dimension: string;
    operation: string;
    field?: string;
    formula?: string;
    isPreviousIncompatible?: boolean;
    palette?: { mode: 'legacy' | 'colorMapping'; id: string };
    keepOpen?: boolean;
  }) {
    await this.openDimensionSelector(opts.dimension);
    if (opts.operation === 'formula') {
      await this.switchToFormula();
    } else {
      await this.selectOperation(opts.operation, opts.isPreviousIncompatible);
    }
    if (opts.field) {
      await this.selectField(opts.field);
    }
    if (opts.formula !== undefined) {
      await this.typeFormula(opts.formula);
    }
    if (opts.palette) {
      await this.setPalette(opts.palette.id, opts.palette.mode === 'legacy');
    }
    if (!opts.keepOpen) {
      await this.closeDimensionEditor();
    }
  }

  async closeDimensionEditorPanel() {
    await this.closeDimensionEditor();
  }

  /** Closes the open dimension editor flyout. */
  async closeDimensionEditor() {
    await this.closeDimensionEditorButton.click();
    await this.closeDimensionEditorButton.waitFor({ state: 'hidden' });
  }

  /** Removes all dimensions from the given panel, polling until none remain. */
  async removeAllDimensions(dimensionTestSubj: string) {
    const removeLocator = this.page.testSubj.locator(
      `${dimensionTestSubj} > indexPattern-dimension-remove`
    );
    await expect
      .poll(
        async () => {
          const buttons = await removeLocator.all();
          if (buttons.length > 0) {
            await buttons[0].hover();
            await buttons[0].click();
          }
          return removeLocator.count();
        },
        { timeout: 30_000 }
      )
      .toBe(0);
  }

  /**
   * Activates the layer tab at `index`. Requires the tabs row to be visible (multi-layer charts).
   * Tab `data-test-subj` values use layer ids (not numeric indices), so tabs are resolved by order.
   */
  async activateLayerTab(index: number) {
    await expect.poll(async () => await this.layerTabsLocator.count()).toBeGreaterThan(index);

    const tabs = await this.layerTabsLocator.all();
    const tab = tabs[index];
    if (!tab) {
      throw new Error(`Layer tab not found at index ${index}`);
    }

    await tab.click();
    await this.page.testSubj.locator(`lns-layerPanel-${index}`).waitFor({ state: 'visible' });
  }

  /**
   * Ensures the layer tab at `index` is active, tolerating the single-layer case where the
   * tabs row isn't rendered at all (the lone layer's panel is already showing). Unlike
   * `activateLayerTab`, this is a no-op both when the tab is already selected and when there's
   * no tab bar to select from.
   */
  async ensureLayerTabIsActive(index = 0) {
    const tabs = await this.layerTabsLocator.all();
    const tab = tabs[index];
    if (!tab) {
      return;
    }
    if ((await tab.getAttribute('aria-selected')) === 'true') {
      return;
    }
    await tab.click();
    await this.page.testSubj.locator(`lns-layerPanel-${index}`).waitFor({ state: 'visible' });
  }

  /**
   * Removes the layer at `index`. Layers with more than one available action (e.g. an
   * annotation layer that can also be saved to the library) expose their actions behind a
   * split-button popover; a layer with only the remove action skips straight to the remove
   * button. Confirms the follow-up modal when removing would also discard unsaved child state
   * (e.g. an annotation group linked from the library).
   */
  async removeLayer(index = 0) {
    const tabs = await this.layerTabsLocator.all();
    if (tabs[index]) {
      await tabs[index].hover();
    }

    const splitButton = this.page.testSubj.locator(`lnsLayerSplitButton--${index}`);
    const removeButton = this.page.testSubj.locator(`lnsLayerRemove--${index}`);
    // Multi-action layers (e.g. an annotation layer that can also be saved to the library) hide
    // the remove action behind a split-button popover; single-action layers expose it directly.
    // Exactly one of the two is in the DOM at a time, so wait for whichever affordance renders
    // before deciding — the choice can't race the layer actions still mounting after the hover.
    await splitButton.or(removeButton).waitFor({ state: 'visible' });
    if (await splitButton.isVisible()) {
      await splitButton.click();
    }
    await removeButton.click();

    // Removing a layer that owns unsaved child state (e.g. a library-linked annotation group)
    // prompts a confirm modal; confirm it when present.
    const removeModal = this.page.testSubj.locator('lnsLayerRemoveModal');
    if (await removeModal.isVisible()) {
      await this.page.testSubj.click('lnsLayerRemoveConfirmButton');
      await removeModal.waitFor({ state: 'hidden' });
    }
  }

  /**
   * Opens the layer-actions popover for the layer at `index` and clicks the given action
   * (e.g. `lnsXY_annotationLayer_saveToLibrary`).
   */
  async performLayerAction(testSubject: string, layerIndex = 0) {
    const tabs = await this.layerTabsLocator.all();
    if (tabs[layerIndex]) {
      await tabs[layerIndex].hover();
    }
    await this.page.testSubj.click(`lnsLayerSplitButton--${layerIndex}`);
    await this.page.testSubj.click(testSubject);
  }

  /** Returns the selected axis side label from an open dimension editor. */
  async getSelectedAxisSide(): Promise<string> {
    const selectedButton = this.page.locator(
      '[data-test-subj^="lnsXY_axisSide_groups_"][aria-pressed="true"]'
    );
    await selectedButton.waitFor({ state: 'visible' });
    const text = (await selectedButton.innerText()).trim();
    if (!text) {
      throw new Error('Axis side button text not yet rendered');
    }
    return text;
  }

  /** Returns the selected bar orientation from the style settings flyout. */
  async getSelectedBarOrientationSetting(): Promise<string> {
    await this.openStyleSettingsFlyout();

    const selectedButton = this.page.locator(
      '[data-test-subj^="lns_barOrientation_"][aria-pressed="true"]'
    );
    await selectedButton.waitFor({ state: 'visible' });
    return (await selectedButton.innerText()).trim();
  }

  async setTermsNumberOfValues(value: number) {
    const input = this.page.locator('input[data-test-subj="indexPattern-terms-values"]');
    await input.waitFor({ state: 'visible' });
    // `ValuesInput`'s `useDebounceWithOptions` skips exactly one *executed* debounce callback to
    // avoid re-committing the initial value on mount, tracked by a ref that only flips once that
    // callback actually runs — not by elapsed time. Editing the field faster than its 256ms
    // debounce (as Playwright does) cancels that initial callback before it runs, so the skip
    // lands on our real edit instead, silently dropping it. Waiting out that first cycle here
    // avoids the race. There is no DOM signal for this internal, ref-tracked callback, so a
    // timed wait is unavoidable (kept consistent with the disable used elsewhere in this file).
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(300);
    await input.click();
    await input.fill('');
    await input.pressSequentially(`${value}`);
    await expect(input).toHaveValue(`${value}`);
    // Same reasoning as above: let this edit's own debounce commit before the caller closes the
    // editor, which would unmount `ValuesInput` and cancel the pending (uncommitted) callback.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(300);
    await this.page.keyboard.press('Tab');
  }

  async setTableDynamicColoring(coloringType: 'none' | 'cell' | 'text' | 'badge') {
    await this.page.testSubj.click('lnsDatatable_dynamicColoring_groups');
    await this.page.testSubj.click(`lnsDatatable_dynamicColoring_groups_${coloringType}`);
  }

  async setPalette(paletteId: string, isLegacy: boolean) {
    await this.openPalettePanelFlyout();

    const paletteModeToggle = this.page.testSubj.locator('lns_colorMappingOrLegacyPalette_switch');
    const targetValue = isLegacy ? 'true' : 'false';
    if ((await paletteModeToggle.getAttribute('aria-checked')) !== targetValue) {
      await paletteModeToggle.click();
    }

    if (isLegacy) {
      await this.page.testSubj.click('lns-palettePicker');
      await this.page.locator(`#${paletteId}`).click();
    } else {
      await this.page.testSubj.click('kbnColoring_ColorMapping_PalettePicker');
      await this.page.testSubj.click(`kbnColoring_ColorMapping_Palette-${paletteId}`);
    }

    await this.closePalettePanelFlyout();
  }

  async closePalettePanelFlyout() {
    await this.page.testSubj.click('lns-indexPattern-SettingWithSiblingFlyoutBack');
    await expect(
      this.page.testSubj.locator('lns-indexPattern-SettingWithSiblingFlyoutBack')
    ).toBeHidden();
  }

  private async openDimensionSelector(dimension: string) {
    await this.page.testSubj.locator(dimension).click();
    await this.closeDimensionEditorButton.waitFor({ state: 'visible' });
  }

  /** Opens a dimension editor flyout from a dimension trigger inside a layer panel. */
  async openDimensionEditor(dimension: string, layerIndex = 0, dimensionIndex = 0) {
    const editorsLocator = this.page.testSubj.locator(
      `lns-layerPanel-${layerIndex} > ${dimension}`
    );
    await expect.poll(async () => await editorsLocator.count()).toBeGreaterThan(dimensionIndex);

    const editors = await editorsLocator.all();
    const editor = editors[dimensionIndex];
    if (!editor) {
      throw new Error(
        `Dimension editor not found at index ${dimensionIndex} for "${dimension}" in layer ${layerIndex}`
      );
    }
    await editor.click();
    await this.closeDimensionEditorButton.waitFor({ state: 'visible' });
  }

  async selectOperation(operation: string, isPreviousIncompatible = false) {
    const operationSelector = isPreviousIncompatible
      ? `lns-indexPatternDimension-${operation} incompatible`
      : `lns-indexPatternDimension-${operation}`;
    const operationButton = this.page.testSubj.locator(operationSelector);
    await operationButton.waitFor({ state: 'visible' });
    await operationButton.scrollIntoViewIfNeeded();
    await operationButton.click();
    await expect(operationButton).toHaveAttribute('aria-pressed', 'true');
  }

  /**
   * Selects a field in the dimension field combo box.
   *
   * Selects by Lens's own per-option `data-test-subj` (`lns-fieldOption(-Incompatible)?-<field>`)
   * rather than the shared combo-box helper's accessible-name match: a field's option name embeds
   * its type icon's label right before the field name with no separator (e.g. "ip" renders as
   * "IP address" + "ip"), so a name-based match can't disambiguate it from another field whose
   * name merely contains it, like "clientip". `'records'` is accepted as an alias for Lens's
   * "Records" pseudo-field, whose internal id (`RECORDS_FIELD_ID`) differs from its display label.
   */
  private async selectField(field: string) {
    const fieldId = field === 'records' ? RECORDS_FIELD_ID : field;
    const fieldCombo = this.page.testSubj.locator('indexPattern-dimension-field');
    const searchField = fieldCombo.getByTestId('comboBoxSearchInput');
    await fieldCombo.getByTestId('comboBoxInput').click();
    await searchField.fill(field);

    const option = this.page.locator(
      `[data-test-subj="lns-fieldOption-${fieldId}"], [data-test-subj="lns-fieldOptionIncompatible-${fieldId}"]`
    );
    await option.waitFor({ state: 'visible' });
    await option.click();
    // Matches the shared combo-box helper's own selection flow: blurs the search input so the
    // dropdown fully closes and doesn't intercept focus/keyboard input meant for the next control.
    await searchField.blur();
  }

  /** Clears the dimension field combo box (removes the currently selected field). */
  async clearDimensionField() {
    await this.page.components.comboBox('indexPattern-dimension-field').clear();
  }

  private async openChartSwitchPopover() {
    await this.chartSwitchPopover.click();
    await this.chartSwitchList.waitFor({ state: 'visible' });
  }

  async dragFieldToWorkspace(field: string) {
    const fieldLocator = this.page.testSubj.locator(`lnsFieldListPanelField-${field}`);
    const dropTarget = this.page.testSubj.locator('workspace-drag-drop-prompt');
    await fieldLocator.dragTo(dropTarget);
    await this.page.locator('.echCanvasRenderer').waitFor({ state: 'visible' });
  }

  getConvertToEsqlButton() {
    return this.page.getByRole('button', { name: 'Convert to ES|QL' });
  }

  getConvertToEsqModal() {
    return this.page.getByTestId('lnsConvertToEsqlModal');
  }

  getConvertToEsqModalConfirmButton() {
    return this.page.getByTestId('confirmModalConfirmButton');
  }

  getApplyFlyoutButton() {
    return this.page.getByTestId('applyFlyoutButton');
  }

  getSecondaryFlyoutBackButton() {
    return this.page.getByTestId('lns-indexPattern-dimensionContainerClose');
  }

  getInlineEditor() {
    return this.page.getByTestId('customizeLens');
  }

  getCancelFlyoutButton() {
    return this.page.getByTestId('cancelFlyoutButton');
  }

  getEditInLensButton() {
    return this.page.getByTestId('navigateToLensEditorLink');
  }

  /**
   * Waits for the Lens visualization workspace to finish rendering.
   * Polls `data-rendering-count` on the visualization container until it
   * stabilises across two consecutive reads (500 ms apart).
   */
  async waitForVisualization(chartSubj = 'lnsVisualizationContainer') {
    const workspace = this.page.testSubj.locator('lnsWorkspace');
    await workspace.waitFor({ state: 'visible' });

    const container = workspace.getByTestId(chartSubj);
    await container.waitFor({ state: 'visible' });

    let prevCount: string | null = null;
    await expect
      .poll(
        async () => {
          const count = await container.getAttribute('data-rendering-count');
          if (count === null) {
            return true;
          }
          if (count === '0') {
            return false;
          }
          if (prevCount === count) {
            return true;
          }
          prevCount = count;
          return false;
        },
        { intervals: [500] }
      )
      .toBe(true);
  }

  /** Returns the number of layers in the Lens editor (unified-tabs row is hidden for a single layer). */
  async getLayerCount(): Promise<number> {
    const tabs = await this.layerTabsLocator.count();
    return tabs === 0 ? 1 : tabs;
  }

  /** Locator for all dimension-trigger buttons in the Lens config panel. */
  getDimensionTriggerLocator() {
    return this.page.testSubj.locator('lns-dimensionTrigger');
  }

  /** Returns all dimension-trigger button locators currently rendered in the editor. */
  getDimensionTriggers() {
    return this.getDimensionTriggerLocator().all();
  }

  /** Returns visible labels for all dimension triggers inside a dimension panel. */
  async getDimensionTriggersTexts(dimension: string): Promise<string[]> {
    const triggersLocator = this.page.testSubj.locator(`${dimension} > lns-dimensionTrigger`);
    await expect.poll(async () => await triggersLocator.count()).toBeGreaterThan(0);

    const triggers = await triggersLocator.all();
    const texts: string[] = [];
    for (const trigger of triggers) {
      texts.push(await trigger.innerText());
    }
    // Lens inserts zero-width spaces around dots in field names for line-breaking.
    return texts.map((text) => text.replace(/\u200b/g, '').trim());
  }

  /** Returns the visible label of a dimension trigger inside a dimension panel. */
  async getDimensionTriggerText(dimension: string, index = 0): Promise<string> {
    const dimensionTexts = await this.getDimensionTriggersTexts(dimension);
    const text = dimensionTexts[index];
    if (text === undefined) {
      throw new Error(`Dimension trigger not found at index ${index} for "${dimension}"`);
    }
    return text;
  }

  /** Returns the chart type label shown in the chart switcher popover. */
  async getChartSwitchType(): Promise<string> {
    await this.chartSwitchPopover.waitFor({ state: 'visible' });
    return (await this.chartSwitchPopover.innerText()).trim();
  }

  private async openStyleSettingsFlyout() {
    await this.page.locator('button[data-test-subj="style"]').click();
    await this.page.locator('#lnsDimensionContainerTitle').waitFor({ state: 'visible' });
  }

  /** Reads the selected donut hole size from the style settings flyout. */
  async getDonutHoleSize(): Promise<string> {
    await this.openStyleSettingsFlyout();
    const selectedOptions = await this.page.components
      .comboBox('lnsEmptySizeRatioOption')
      .getSelectedOptions();
    return selectedOptions[0] ?? '';
  }

  /**
   * Hovers over a dimension-trigger button so that metric tiles are in their
   * default (un-hovered) state before asserting colors.
   */
  async hoverOverDimensionButton(index = 0) {
    const triggersLocator = this.getDimensionTriggerLocator();
    await expect.poll(async () => await triggersLocator.count()).toBeGreaterThan(index);

    const triggers = await triggersLocator.all();
    const trigger = triggers[index];
    if (!trigger) {
      throw new Error(`Dimension trigger not found at index ${index}`);
    }
    await trigger.hover();
    // Move the pointer off the metric tiles so hover styles do not affect color assertions.
    await this.page.testSubj.locator('lns-layerPanel-0').hover();
  }

  /** Locator matching every Elastic Charts metric tile currently rendered. */
  getMetricTilesLocator() {
    return this.metricTilesLocator;
  }

  /** Returns locators for each Elastic Charts metric tile currently rendered. */
  getMetricTiles() {
    return this.metricTilesLocator.all();
  }

  /**
   * Clicks the metric tile whose title matches exactly (e.g. to trigger a click-to-filter
   * action). Throws if no tile has that title.
   */
  async clickMetricTileByTitle(title: string) {
    const data = await this.getMetricVisualizationData();
    const index = data.findIndex((datum) => datum.title === title);
    if (index === -1) {
      throw new Error(`Metric tile with title "${title}" not found`);
    }
    const tiles = await this.getMetricTiles();
    await tiles[index].click();
  }

  /** Reads the current state of every metric tile inside `[data-test-subj="mtrVis"]`. */
  async getMetricVisualizationData() {
    const tiles = await this.getMetricTiles();
    const showingBar = (await this.page.locator('.echSingleMetricProgress').count()) > 0;

    const data = [];
    for (const tile of tiles) {
      const getText = async (selector: string) => {
        const el = tile.locator(selector);
        if ((await el.count()) === 0) return undefined;
        return el.evaluate((node) => (node as HTMLElement).innerText);
      };
      const getColor = async (selector: string) => {
        const el = tile.locator(selector);
        if ((await el.count()) === 0) return undefined;
        const color = await el.evaluate((node) => getComputedStyle(node).backgroundColor);
        return normalizeComputedColor(color);
      };

      data.push({
        title: await getText('h2'),
        subtitle: await getText('.echMetricText__subtitle'),
        extraText: await getText('.echMetricText__extraBlock'),
        value: await getText('.echMetricText__valueBlock'),
        color: await getColor('.echMetric'),
        trendlineColor: await (async () => {
          const el = tile.locator('.echSingleMetricSparkline__svg > rect');
          if ((await el.count()) === 0) return undefined;
          return (await el.getAttribute('fill')) ?? undefined;
        })(),
        showingTrendline: (await tile.locator('.echSingleMetricSparkline').count()) > 0,
        showingBar,
      });
    }

    return data;
  }

  /** Returns whether the metric's secondary-value trend badge (icon/value) is visible. */
  async hasSecondaryMetricBadge(): Promise<boolean> {
    return (await this.secondaryMetricBadge.count()) > 0;
  }

  /** Returns the visible text of the secondary-value trend badge, or `undefined` if absent. */
  async getSecondaryMetricBadgeText(): Promise<string | undefined> {
    if ((await this.secondaryMetricBadge.count()) === 0) {
      return undefined;
    }
    return (await this.secondaryMetricBadge.innerText()).trim();
  }

  /**
   * Returns the secondary-value trend badge locator, so callers can assert its background
   * color with `toHaveCSS` (auto-retries until the debounced color update settles).
   */
  getSecondaryMetricBadgeLocator() {
    return this.secondaryMetricBadge;
  }

  /** Returns the secondary metric's label text, or `undefined` if not rendered. */
  async getSecondaryMetricLabel(): Promise<string | undefined> {
    if ((await this.secondaryMetricLabel.count()) === 0) {
      return undefined;
    }
    return (await this.secondaryMetricLabel.innerText()).trim();
  }

  /**
   * Sets the format of the currently open dimension, and optionally its decimal places
   * and suffix/prefix text.
   */
  async editDimensionFormat(format: string, options?: { decimals?: number; prefix?: string }) {
    await this.page.components
      .comboBox('indexPattern-dimension-format')
      .setSelectedOptions([format]);
    if (options?.decimals != null) {
      const decimalsInput = this.page.testSubj.locator('indexPattern-dimension-formatDecimals');
      await decimalsInput.fill(`${options.decimals}`);
      await this.page.keyboard.press('Tab');
    }
    if (options?.prefix != null) {
      await this.page.testSubj.locator('indexPattern-dimension-formatSuffix').fill(options.prefix);
    }
  }

  /**
   * Sets a hex value in the currently open EUI color picker (dimension editor color mode),
   * replacing any existing value. The recolor is debounced, so callers should assert the
   * settled effect (computed tile/badge color) rather than the input value.
   */
  async setColorPickerValue(hex: string) {
    const colorPicker = this.page.testSubj.locator('euiColorPickerAnchor');
    await colorPicker.clear();
    await colorPicker.fill(hex);
    await this.page.keyboard.press('Tab');
  }

  /**
   * Enables the "Include empty rows" switch in the open index-pattern dimension editor and
   * waits for it to register as checked before returning.
   */
  async enableIncludeEmptyRows() {
    const includeEmptyRowsSwitch = this.page.testSubj.locator('indexPattern-include-empty-rows');
    await includeEmptyRowsSwitch.click();
    await expect(includeEmptyRowsSwitch).toHaveAttribute('aria-checked', 'true');
  }

  async openMessageList() {
    const trigger = this.page.testSubj.locator('lens-message-list-trigger');
    await trigger.click();
  }

  async closeMessageList() {
    const trigger = this.page.testSubj.locator('lens-message-list-trigger');
    await trigger.click();
  }

  getMessageListItems(severity: 'warning' | 'error') {
    return this.page.testSubj.locator(`lens-message-list-${severity}`);
  }

  /** Opens the palette panel flyout for the currently active dimension. */
  async openPalettePanelFlyout() {
    await this.page.testSubj.click('lns_colorEditing_trigger');
    await this.page.testSubj.locator('lns-palettePanelFlyout').waitFor({
      state: 'visible',
      timeout: 10_000,
    });
  }

  /** Reads color-stop values and colors from the currently open palette panel. */
  async getPaletteColorStops(expectedStopsCount?: number) {
    const palettePanel = this.page.testSubj.locator('lns-palettePanelFlyout');
    const stopInputsLocator = palettePanel.locator(
      '[data-test-subj^="lnsPalettePanel_dynamicColoring_range_value_"]'
    );
    const colorAnchorsLocator = palettePanel.locator('[data-test-subj="euiColorPickerAnchor"]');

    const readColorStops = async () => {
      const stopInputs = await stopInputsLocator.all();
      const colorAnchors = await colorAnchorsLocator.all();

      const colorStops = [];
      for (let i = 0; i < stopInputs.length; i++) {
        const input = stopInputs[i];
        const colorAnchor = colorAnchors[i];
        colorStops.push({
          stop: await input.getAttribute('value'),
          color:
            colorAnchor != null
              ? normalizeComputedColor(
                  await colorAnchor.evaluate((node) => getComputedStyle(node).backgroundColor)
                )
              : undefined,
        });
      }

      return colorStops;
    };

    let prevColorStopsJson: string | null = null;
    await expect
      .poll(
        async () => {
          const stopCount = await stopInputsLocator.count();
          if (expectedStopsCount !== undefined && stopCount !== expectedStopsCount) {
            return false;
          }
          if (stopCount === 0) {
            return false;
          }

          const colorStopsJson = JSON.stringify(await readColorStops());
          if (prevColorStopsJson === colorStopsJson) {
            return true;
          }
          prevColorStopsJson = colorStopsJson;
          return false;
        },
        { intervals: [500], timeout: 20_000 }
      )
      .toBe(true);

    return readColorStops();
  }

  /** Switches the open dimension editor to the Formula tab and waits for the editor. */
  async switchToFormula() {
    await this.formulaTab.click();
    await this.formulaFullscreenButton.waitFor({ state: 'visible' });
  }

  /**
   * Types a formula into the open formula editor, replacing any existing content.
   * Pass an empty string to clear the formula. Callers should wait for the
   * visualization to re-render afterwards (the editor debounces input).
   */
  async typeFormula(formula: string) {
    await this.formulaEditorInput.waitFor({ state: 'visible' });
    await this.formulaEditorInput.click();
    await this.page.keyboard.press('ControlOrMeta+A');
    await this.page.keyboard.press('Delete');
    if (formula) {
      await this.page.keyboard.type(formula);
    }
  }

  /** Toggles the formula editor fullscreen mode. */
  async toggleFullscreen() {
    await this.formulaFullscreenButton.click();
  }

  /** Opens the Lens settings menu (auto-apply toggle lives here). */
  async openSettingsMenu() {
    await this.settingsButton.click();
    await this.settingsMenu.waitFor({ state: 'visible' });
  }

  /** Closes the Lens settings menu. */
  async closeSettingsMenu() {
    await this.settingsButton.click();
    await this.settingsMenu.waitFor({ state: 'hidden' });
  }

  /** Locator for the auto-apply toggle. Requires the settings menu to be open. */
  getAutoApplyToggle() {
    return this.autoApplyToggle;
  }

  /** Toggles the auto-apply setting. Requires the settings menu to be open. */
  async toggleAutoApply() {
    await this.autoApplyToggle.click();
  }

  /** Waits for the empty Lens workspace drop prompt to be visible. */
  async waitForEmptyWorkspace() {
    await this.emptyWorkspacePrompt.waitFor({ state: 'visible' });
  }

  /** Waits for the workspace "apply changes" prompt (shown when auto-apply is disabled). */
  async waitForWorkspaceWithApplyChangesPrompt() {
    await this.workspaceApplyChangesPrompt.waitFor({ state: 'visible' });
  }

  /**
   * Adds a new layer of the given type. For annotation layers, pass
   * `annotationFromLibraryTitle` to add a layer from a saved annotation group.
   */
  async createLayer(
    layerType: 'data' | 'referenceLine' | 'annotations' = 'data',
    annotationFromLibraryTitle?: string,
    seriesType = 'bar'
  ) {
    await this.layerAddButton.click();
    const typeButton = this.page.testSubj.locator(`lnsLayerAddButton-${layerType}`);
    await typeButton.waitFor({ state: 'visible' });
    await typeButton.click();

    if (layerType === 'data') {
      await this.page.testSubj.click(`lnsXY_seriesType-${seriesType}`);
    } else if (layerType === 'annotations') {
      if (annotationFromLibraryTitle) {
        await this.page.testSubj.click('lnsAnnotationLayer_addFromLibrary');
        await this.page.testSubj.click(
          `savedObjectTitle${annotationFromLibraryTitle.split(' ').join('-')}`
        );
      } else {
        await this.page.testSubj.click('lnsAnnotationLayer_new');
      }
    }
  }

  private async waitForDragDropToFinish() {
    await this.page.locator('.domDragDrop-isActiveGroup').waitFor({ state: 'hidden' });
  }

  /**
   * Drags a data-panel field onto a dimension trigger/empty-dimension target.
   * Scoped to the "Available fields" list: once a field is already used elsewhere
   * in the chart, it renders in both the "Selected fields" and "Available fields"
   * sections, so an unscoped test-subj match is ambiguous.
   */
  async dragFieldToDimensionTrigger(field: string, dimension: string) {
    const from = this.page.testSubj.locator(
      `lnsIndexPatternAvailableFields > lnsFieldListPanelField-${field}`
    );
    const to = this.page.testSubj.locator(dimension);
    await from.dragTo(to);
    await this.waitForDragDropToFinish();
  }

  /**
   * Moves one dimension onto another dimension trigger/empty-dimension target,
   * including *between different dimension groups* (e.g. left/right reference-line
   * axes). If a selector matches more than one element (e.g. a group with multiple
   * dimension triggers), the first one is used — matching the FTR test's implicit
   * first-DOM-match behavior for this scenario.
   *
   * `kbn-dom-drag-drop` relies on real native `dragenter`/`dragover` bookkeeping to
   * pick the correct drop type before the `drop` event fires. Neither
   * `locator.dragTo()` nor manually dispatched `dragstart`/`drop`/`dragend` events
   * reproduce that incremental hover sequence, and both can leave the source
   * dimension in a corrupted state when moving *between* groups. Driving the mouse
   * through real intermediate positions (down → move in steps → move to target in
   * steps → up) lets the browser emit the full native drag sequence, which this
   * component needs.
   */
  async dragDimensionToDimension({ from, to }: { from: string; to: string }) {
    // eslint-disable-next-line playwright/no-nth-methods
    const fromTrigger = this.page.testSubj.locator(from).first();
    // eslint-disable-next-line playwright/no-nth-methods
    const toTarget = this.page.testSubj.locator(to).first();
    await fromTrigger.waitFor({ state: 'visible' });
    await toTarget.waitFor({ state: 'visible' });

    const fromBox = await fromTrigger.boundingBox();
    const toBox = await toTarget.boundingBox();
    if (!fromBox || !toBox) {
      throw new Error(
        `dragDimensionToDimension: could not resolve bounding box for "${from}" or "${to}"`
      );
    }

    const fromCenter = { x: fromBox.x + fromBox.width / 2, y: fromBox.y + fromBox.height / 2 };
    const toCenter = { x: toBox.x + toBox.width / 2, y: toBox.y + toBox.height / 2 };

    await this.page.mouse.move(fromCenter.x, fromCenter.y);
    await this.page.mouse.down();
    // A small initial move is required to make the browser recognize the gesture
    // as a drag (rather than a click) before heading to the drop target.
    await this.page.mouse.move(fromCenter.x + 10, fromCenter.y + 10, { steps: 5 });
    await this.page.mouse.move(toCenter.x, toCenter.y, { steps: 15 });
    // `kbn-dom-drag-drop` resolves the hovered drop target (and its drop type)
    // from the `dragover` events dispatched during the move above, via a Redux
    // dispatch that settles a tick after the events fire. There is no DOM
    // signal to wait on for this internal, transient bookkeeping — releasing
    // the mouse before it settles fires the drop before the drop type is
    // resolved, corrupting the source dimension. 300ms is comfortably above
    // observed settle time; validated with 15+ repeated local runs.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(300);
    await this.page.mouse.up();

    await this.waitForDragDropToFinish();
  }

  /** Changes the axis side of the currently open dimension editor. */
  async changeAxisSide(newSide: 'left' | 'right' | 'auto') {
    await this.page.testSubj.click(`lnsXY_axisSide_groups_${newSide}`);
  }

  /**
   * Configures a query-based annotation in the currently open annotation dimension editor.
   * The query textarea lives inside a popover that opens by default for a fresh query
   * annotation; typing into it and then toggling the trigger link commits the value before the
   * time-field picker underneath can be interacted with.
   */
  async configureQueryAnnotation(opts: {
    queryString: string;
    timeField: string;
    textDecoration?: { type: 'none' | 'name' | 'field'; textField?: string };
    extraFields?: string[];
  }) {
    await this.page.testSubj.locator('annotation-query-based-query-input').fill(opts.queryString);
    await this.page.testSubj.click('indexPattern-filters-existingFilterTrigger');
    await this.page.components
      .comboBox('lnsXY-annotation-query-based-field-picker')
      .setSelectedOptions([opts.timeField]);

    if (opts.textDecoration) {
      await this.setAnnotationTextVisibility(opts.textDecoration.type);
      if (opts.textDecoration.textField) {
        await this.page.components
          .comboBox('lnsXY-annotation-query-based-text-decoration-field-picker')
          .setSelectedOptions([opts.textDecoration.textField]);
      }
    }

    if (opts.extraFields) {
      for (const field of opts.extraFields) {
        await this.addFieldToTooltip(field);
      }
    }
  }

  /** Sets the text-decoration mode in the currently open annotation dimension editor. */
  async setAnnotationTextVisibility(mode: 'none' | 'name' | 'field') {
    await this.page.testSubj.click(`lnsXY_textVisibility_${mode}`);
  }

  /** Adds another tooltip field row to the currently open annotation dimension editor. */
  private async addFieldToTooltip(fieldName: string) {
    const existingPickers = await this.page
      .locator('[data-test-subj^="lnsXY-annotation-tooltip-field-picker"]')
      .count();
    await this.page.testSubj.click('lnsXY-annotation-tooltip-add_field');
    await this.page.components
      .comboBox(`lnsXY-annotation-tooltip-field-picker--${existingPickers}`)
      .setSelectedOptions([fieldName]);
  }

  /** Locator for the reference-line "fill below" style button in the open dimension editor. */
  getReferenceLineFillBelowButton() {
    return this.referenceLineFillBelowButton;
  }

  /** Enables the "fill below" style for the reference line in the open dimension editor. */
  async setReferenceLineFillBelow() {
    await this.referenceLineFillBelowButton.click();
  }

  /** Selects a predefined palette from the open palette panel's palette picker. */
  async changePaletteTo(paletteName: string) {
    await this.page.testSubj.click('lnsPalettePanel_dynamicColoring_palette_picker');
    await this.page.testSubj.click(`${paletteName}-palette`);
  }

  /** Reverses the palette colors from the open palette panel. */
  async reversePaletteColors() {
    await this.page.testSubj.click('lnsPalettePanel_dynamicColoring_reverseColors');
  }

  /**
   * Sets a palette color-stop range value (1-based index) in the open palette panel.
   * The resulting recolor is debounced; callers should assert the settled effect
   * (for example the metric's computed color) rather than the input's own value.
   */
  async setPaletteRangeValue(index: number, value: string) {
    const input = this.page.testSubj.locator(
      `lnsPalettePanel_dynamicColoring_range_value_${index}`
    );
    await input.fill(value);
    await this.page.keyboard.press('Tab');
  }

  /** Returns the title and value rendered by a legacy metric visualization. */
  async getLegacyMetricData(): Promise<{ title: string; value: string }> {
    return {
      title: await this.page.testSubj.innerText('metric_label'),
      value: await this.page.testSubj.innerText('metric_value'),
    };
  }

  /** Clicks the legacy metric label (used to create a filter). */
  async clickLegacyMetric() {
    await this.page.testSubj.click('metric_label');
  }

  /** Sets the legacy metric dynamic coloring mode. */
  async setLegacyMetricColoringMode(mode: 'none' | 'labels' | 'background') {
    await this.page.testSubj.click(`lnsLegacyMetric_dynamicColoring_groups_${mode}`);
  }

  /**
   * Locator for the legacy metric value element. Prefer asserting its computed
   * color with `expect(...).toHaveCSS('color', ...)` over `getLegacyMetricStyle()`
   * when checking a color that was just changed — coloring updates are debounced,
   * so a point-in-time read of the `style` attribute can race the update, while
   * `toHaveCSS` auto-retries until the color settles.
   */
  getLegacyMetricValueLocator() {
    return this.legacyMetricValue;
  }

  /** Parses the inline `style` attribute of the legacy metric value element into a map. */
  async getLegacyMetricStyle(): Promise<Record<string, string>> {
    const style = (await this.legacyMetricValue.getAttribute('style')) ?? '';
    return style.split(';').reduce<Record<string, string>>((memo, cssLine) => {
      const [prop, value] = cssLine.split(':');
      if (prop && value) {
        memo[prop.trim()] = value.trim();
      }
      return memo;
    }, {});
  }
}
