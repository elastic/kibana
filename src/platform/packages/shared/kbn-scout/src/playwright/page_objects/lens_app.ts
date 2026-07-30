/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DebugState } from '@elastic/charts';
import type { ScoutPage } from '..';
import { expect } from '..';
import { KibanaCodeEditorWrapper } from '../ui_components';

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
  private readonly flyoutBackButton;
  private readonly styleSettingsButton;
  /** Style flyout title — Lens uses a DOM id, not a data-test-subj (FTR parity). */
  private readonly dimensionContainerTitle;
  private readonly suggestionPanelToggle;
  public readonly applyChangesButton;
  public readonly chartTitle;
  /** XY legend items (elastic-charts does not expose a `data-test-subj` for these). */
  public readonly xyLegendItems;
  private readonly goBackToAppButton;
  private readonly discardChangesModal;
  private readonly confirmModalConfirmButton;
  private readonly messageListTrigger;
  private readonly dataTable;
  /**
   * Formula Monaco textarea — Lens has no data-test-subj on the editor input.
   * Note: `lnsFormulaWidget` is the overflow/suggest portal on `document.body`, not the editor.
   */
  private readonly formulaEditorTextarea;
  private readonly codeEditor: KibanaCodeEditorWrapper;

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
    this.flyoutBackButton = this.page.testSubj.locator('lns-indexPattern-dimensionContainerBack');
    this.styleSettingsButton = this.page.locator('button[data-test-subj="style"]');
    this.dimensionContainerTitle = this.page.locator('#lnsDimensionContainerTitle');
    this.suggestionPanelToggle = this.page.testSubj.locator('lensSuggestionsPanelToggleButton');
    this.applyChangesButton = this.page.testSubj.locator('lnsApplyChanges__apply');
    this.chartTitle = this.page.testSubj.locator('lns_ChartTitle');
    this.xyLegendItems = this.page.locator('.echLegendItem');
    this.goBackToAppButton = this.page.testSubj.locator('lnsApp_goBackToAppButton');
    this.discardChangesModal = this.page.testSubj.locator('lnsApp_discardChangesModalOrigin');
    this.confirmModalConfirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
    this.messageListTrigger = this.page.testSubj.locator('lens-message-list-trigger');
    this.dataTable = this.page.testSubj.locator('lnsDataTable');
    this.formulaEditorTextarea = this.page.locator(
      '.lnsFormula__editorContent .monaco-editor textarea'
    );
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async waitForLensApp() {
    await this.lensApp.waitFor({ state: 'visible', timeout: 20_000 });
  }

  async openFullEditor() {
    await this.page.gotoApp('lens');
    await this.waitForLensApp();
  }

  /**
   * Navigates directly to the Lens editor for a saved visualization and waits for its
   * chart to render. Prefer this over going through the visualize listing page when the
   * saved-object id is known (e.g. fixture-loaded or freshly-saved visualizations).
   *
   * @param id - saved-object id of the Lens visualization
   * @param chartTestSubj - `data-test-subj` of the rendered chart container
   *   (e.g. `xyVisChart`, `partitionVisChart`, `mtrVis`, `legacyMtrVis`,
   *   `lnsVisualizationContainer` for datatable).
   */
  async openEditor(id: string, chartTestSubj: string) {
    await this.page.gotoApp('lens', { hash: `/edit/${id}` });
    await this.waitForVisualization(chartTestSubj);
  }

  /**
   * Adds a new KQL filter row to a filters-aggregation dimension editor.
   *
   * The query input debounces its `onChange` (~256ms; see `useDebouncedValue`
   * in `@kbn/visualization-utils`), so the typed query only reaches the parent
   * `filter.input` after the debounce fires. If we close the popover before
   * then, `FilterPopover.closePopover` resets the input back to the default
   * (`localFilter.input = filter.input`) and the filter reverts to
   * "All records". We wait for the label input's placeholder — which mirrors
   * `localFilter.input.query` — to match the typed query as the visible DOM
   * signal that the debounce has flushed.
   */
  async addFilterToAgg(kql: string) {
    await this.page.testSubj.click('lns-newBucket-add');
    const queryInput = this.page.testSubj.locator('indexPattern-filters-queryStringInput');
    await queryInput.waitFor({ state: 'visible' });
    await queryInput.pressSequentially(kql);
    await this.page.waitForFunction((expected) => {
      const el = document.querySelector('[data-test-subj="indexPattern-filters-label"]');
      return el instanceof HTMLInputElement && el.placeholder === expected;
    }, kql);
    // Close the popover by clicking its trigger button (identified by the typed query text).
    // This toggles `activeFilterId` without invoking `closePopover()` (which resets
    // localFilter.input to the prop value and can race with React's prop propagation).
    await this.page.testSubj
      .locator('indexPattern-filters-existingFilterTrigger')
      .filter({ hasText: kql })
      .click();
  }

  /** Returns the visible label of every existing filter row in a filters-aggregation editor. */
  async getFiltersAggLabels(): Promise<string[]> {
    const filters = await this.page.testSubj
      .locator('indexPattern-filters-existingFilterContainer')
      .all();
    return Promise.all(filters.map(async (filter) => (await filter.innerText()).trim()));
  }

  /** Reads the current title displayed in the Lens editor header. */
  async getChartTitle(): Promise<string> {
    return (await this.page.testSubj.locator('lns_ChartTitle').innerText()).trim();
  }

  /**
   * Switches the data view of a Lens layer via the layer's data view picker.
   *
   * @param dataViewTitle - title of the target data view (must already exist in the space).
   * @param layerIndex - layer to switch; defaults to the first layer.
   */
  async switchLayerIndexPattern(dataViewTitle: string, layerIndex = 0) {
    const trigger = this.getLayerIndexPatternTrigger(layerIndex);
    await trigger.click();
    const switcher = this.page.testSubj.locator('indexPattern-switcher');
    await switcher.waitFor({ state: 'visible' });
    await this.page.testSubj.typeWithDelay('indexPattern-switcher--input', dataViewTitle);
    await switcher.locator(`[data-test-subj="dataView-${dataViewTitle}"]`).click();
    await switcher.waitFor({ state: 'hidden' });
  }

  /** Returns the title of the currently selected data view for the given layer. */
  async getSelectedLayerIndexPattern(layerIndex = 0): Promise<string> {
    const trigger = this.getLayerIndexPatternTrigger(layerIndex);
    await trigger.waitFor({ state: 'visible' });
    return (await trigger.innerText()).trim();
  }

  private getLayerIndexPatternTrigger(layerIndex: number) {
    return layerIndex === 0
      ? this.page.testSubj.locator('lns_layerIndexPatternLabel')
      : this.page.testSubj.locator(`lns-layerPanel-${layerIndex} > lns_layerIndexPatternLabel`);
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

  async applyChanges() {
    await this.applyChangesButton.click();
    await expect(this.applyChangesButton).toBeHidden();
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
    palette?: { mode: 'legacy' | 'colorMapping'; id: string };
    formula?: string;
    disableEmptyRows?: boolean;
    keepOpen?: boolean;
    isPreviousIncompatible?: boolean;
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
    if (opts.formula) {
      await this.typeInFormula(opts.formula, { replace: true });
    }
    if (opts.palette) {
      await this.setPalette(opts.palette.id, opts.palette.mode === 'legacy');
    }
    if (opts.disableEmptyRows) {
      await this.setEuiSwitch('indexPattern-include-empty-rows', false);
    }
    if (!opts.keepOpen) {
      await this.closeDimensionEditor();
    }
  }

  async closeDimensionEditorPanel() {
    await this.closeDimensionEditor();
  }

  /**
   * Closes the open dimension editor flyout.
   * Caller must have the dimension editor open.
   */
  async closeDimensionEditor() {
    // Suggested-value panels can remount and exceed the 10s actionTimeout.
    await this.closeDimensionEditorButton.click({ timeout: 15_000 });
    await this.closeDimensionEditorButton.waitFor({ state: 'hidden', timeout: 15_000 });
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
        // Sequential remove+re-render per dimension can exceed the 10s expect timeout.
        { timeout: 30_000 }
      )
      .toBe(0);
  }

  /**
   * Activates the layer tab at `index`. Requires the tabs row to be visible (multi-layer charts).
   * Tab `data-test-subj` values use layer ids (not numeric indices), so tabs are resolved by order.
   */
  async activateLayerTab(index: number) {
    const tabsLocator = this.page.locator('[data-test-subj^="unifiedTabs_tab_"]');
    await expect.poll(async () => await tabsLocator.count()).toBeGreaterThan(index);

    const tabs = await tabsLocator.all();
    const tab = tabs[index];
    if (!tab) {
      throw new Error(`Layer tab not found at index ${index}`);
    }

    await tab.click();
    await this.page.testSubj.locator(`lns-layerPanel-${index}`).waitFor({ state: 'visible' });
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

  /**
   * Sets terms "Number of values".
   * ValuesInput debounces parent updates (~256ms) and is a controlled EuiFieldNumber —
   * Playwright fill/pressSequentially often update the DOM without committing `params.size`.
   * Mirror `setInputValue`: invoke the component `onChange(number)` via React props/fiber,
   * then wait for the dimension trigger label to include `Top ${value}`.
   */
  async setTermsNumberOfValues(value: number) {
    const input = this.page.locator(
      'input[data-test-subj="indexPattern-terms-values"][type="number"]'
    );
    await input.waitFor({ state: 'visible' });
    await input.scrollIntoViewIfNeeded();
    await input.click();
    await input.evaluate((el, nextValue) => {
      const inputEl = el as HTMLInputElement & Record<string, unknown>;
      const fiberKey = Object.keys(inputEl).find((key) => key.startsWith('__reactFiber$'));
      if (!fiberKey) {
        throw new Error('React fiber not found on indexPattern-terms-values');
      }
      interface FiberNode {
        memoizedProps?: { value?: unknown; onChange?: (v: number) => void };
        return?: FiberNode | null;
      }
      let fiber: FiberNode | null | undefined = inputEl[fiberKey] as FiberNode;
      while (fiber) {
        const props = fiber.memoizedProps;
        // ValuesInput passes numeric value + onChange(number) — not the string input handler.
        if (props && typeof props.value === 'number' && typeof props.onChange === 'function') {
          props.onChange(Number(nextValue));
          return;
        }
        fiber = fiber.return;
      }
      throw new Error('ValuesInput onChange(number) not found in React fiber tree');
    }, `${value}`);
    // Wait for Lens to commit size into the dimension trigger label (not an assertion).
    // waitForFunction has no Scout default (unlike expect/actionTimeout).
    await this.page.waitForFunction(
      (expected) => {
        const triggers = document.querySelectorAll('[data-test-subj="lns-dimensionTrigger"]');
        return Array.from(triggers).some((el) =>
          (el.textContent ?? '').replace(/\u200b/g, '').includes(`Top ${expected}`)
        );
      },
      value,
      { timeout: 15_000 }
    );
  }

  async setTableDynamicColoring(coloringType: 'none' | 'cell' | 'text' | 'badge' | 'progress') {
    // Cell decoration combo labels diverge from stored values (`cell` → "Background").
    const labelByColoringType: Record<typeof coloringType, string> = {
      none: 'None',
      cell: 'Background',
      text: 'Text',
      badge: 'Badge',
      progress: 'Progress bar',
    };
    await this.page.components
      .comboBox('lnsDatatable_dynamicColoring_groups')
      .setSelectedOptions([labelByColoringType[coloringType]]);
    // Palette editor appears once a non-none decoration assigns palette/colorMapping.
    if (coloringType !== 'none') {
      await this.page.testSubj.locator('lns_dynamicColoring_edit').waitFor({ state: 'visible' });
    }
  }

  private async setPalette(paletteId: string, isLegacy: boolean) {
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
    await this.page.testSubj
      .locator('lns-indexPattern-SettingWithSiblingFlyoutBack')
      .waitFor({ state: 'hidden' });
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
    await this.page.waitForFunction(
      ({ layerPanel, segments, minCount }) => {
        const layer = document.querySelector(`[data-test-subj="${layerPanel}"]`);
        if (!layer) {
          return false;
        }
        let nodes: Element[] = [layer];
        for (const segment of segments) {
          const next: Element[] = [];
          for (const node of nodes) {
            next.push(...Array.from(node.querySelectorAll(`[data-test-subj="${segment}"]`)));
          }
          nodes = next;
        }
        return nodes.length > minCount;
      },
      {
        layerPanel: `lns-layerPanel-${layerIndex}`,
        segments: dimension.split('>').map((part) => part.trim()),
        minCount: dimensionIndex,
      },
      // waitForFunction has no Scout default (unlike expect/actionTimeout).
      { timeout: 10_000 }
    );

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
    await this.page.waitForFunction(
      (selector) =>
        document.querySelector(`[data-test-subj="${selector}"]`)?.getAttribute('aria-pressed') ===
        'true',
      operationSelector,
      // waitForFunction has no Scout default (unlike expect/actionTimeout).
      { timeout: 10_000 }
    );
  }

  private async selectField(field: string) {
    await this.page.components.comboBox('indexPattern-dimension-field').setSelectedOptions([field]);
  }

  /** Clears the dimension field combo box (removes the currently selected field). */
  async clearDimensionField() {
    await this.page.components.comboBox('indexPattern-dimension-field').clear();
  }

  private async openChartSwitchPopover() {
    await this.chartSwitchPopover.click();
    await this.chartSwitchList.waitFor({ state: 'visible' });
  }

  /**
   * Drags a field onto the Lens workspace (FTR `dragFieldToWorkspace`).
   * Uses HTML5 DnD — Playwright `dragTo` does not reliably drive Lens drop zones.
   */
  async dragFieldToWorkspace(field: string, visualizationTestSubj?: string) {
    const fieldLocator = this.getFieldListPanelFieldLocator(field);
    await fieldLocator.waitFor({ state: 'visible' });
    const fieldTestSubj =
      (await fieldLocator.getAttribute('data-test-subj')) ??
      `lnsFieldListPanelField-${this.getFieldAttrName(field)}`;
    await this.html5DragAndDrop(fieldTestSubj, 'lnsWorkspace');
    await this.waitForLensDragDropToFinish();
    if (visualizationTestSubj) {
      await this.waitForVisualization(visualizationTestSubj);
    } else {
      await this.page.locator('.echCanvasRenderer').waitFor({ state: 'visible' });
    }
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
    await workspace.waitFor({ state: 'visible', timeout: 20_000 });

    const container = workspace.getByTestId(chartSubj);
    await container.waitFor({ state: 'visible' });

    await this.page.waitForFunction(
      (subj) => {
        const workspaceEl = document.querySelector('[data-test-subj="lnsWorkspace"]');
        const el = workspaceEl?.querySelector(`[data-test-subj="${subj}"]`);
        if (!el) {
          return false;
        }
        const count = el.getAttribute('data-rendering-count');
        if (count === null) {
          return true;
        }
        if (count === '0') {
          delete (window as unknown as { __lensScoutPrevRenderCount?: string })
            .__lensScoutPrevRenderCount;
          return false;
        }
        const win = window as unknown as { __lensScoutPrevRenderCount?: string };
        const prev = win.__lensScoutPrevRenderCount;
        win.__lensScoutPrevRenderCount = count;
        return prev === count;
      },
      chartSubj,
      // Chart data + render-count settle often exceeds the 10s actionTimeout; keep below the 60s test timeout.
      { polling: 500, timeout: 30_000 }
    );
    await this.page.evaluate(() => {
      delete (window as unknown as { __lensScoutPrevRenderCount?: string })
        .__lensScoutPrevRenderCount;
    });
  }

  /** Returns the number of layers in the Lens editor (unified-tabs row is hidden for a single layer). */
  async getLayerCount(): Promise<number> {
    const tabs = await this.page.locator('[data-test-subj^="unifiedTabs_tab_"]').count();
    return tabs === 0 ? 1 : tabs;
  }

  /** Locator for all dimension-trigger buttons in the Lens config panel. */
  getDimensionTriggerLocator() {
    return this.page.testSubj.locator('lns-dimensionTrigger');
  }

  /**
   * Locator for dimension-trigger buttons inside a panel/group.
   * Prefer `expect(locator).toHaveText(...)` / `toHaveCount(0)` over `expect.poll`
   * + `getDimensionTriggerText` — Playwright auto-waits on the locator.
   */
  getDimensionTriggersLocator(dimension: string) {
    return this.page.testSubj.locator(`${dimension} > lns-dimensionTrigger`);
  }

  /** Returns all dimension-trigger button locators currently rendered in the editor. */
  getDimensionTriggers() {
    return this.getDimensionTriggerLocator().all();
  }

  /**
   * Returns visible labels for all dimension triggers inside a panel/group.
   * Empty panels return `[]` (do not wait for a trigger to appear).
   * Panel test-subj may match multiple wrappers (filled + empty slot); read triggers only.
   * Prefer locator assertions via `getDimensionTriggersLocator` when waiting for UI updates.
   */
  async getDimensionTriggersTexts(dimension: string): Promise<string[]> {
    const triggers = await this.getDimensionTriggersLocator(dimension).all();
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

  /**
   * Opens the Lens style settings flyout.
   * Caller must close any open dimension/palette flyout first.
   */
  async openStyleSettingsFlyout() {
    await this.styleSettingsButton.click();
    await this.dimensionContainerTitle.waitFor({ state: 'visible' });
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

  /** Reads the current state of every metric tile inside `[data-test-subj="mtrVis"]`. */
  async getMetricVisualizationData() {
    const tiles = await this.page.locator('[data-test-subj="mtrVis"] .echChart li').all();
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

  async openMessageList() {
    await this.messageListTrigger.click();
  }

  async closeMessageList() {
    await this.messageListTrigger.click();
  }

  getMessageListItems(severity: 'warning' | 'error') {
    return this.page.testSubj.locator(`lens-message-list-${severity}`);
  }

  /** Opens the palette panel flyout for the currently active dimension. */
  async openPalettePanelFlyout() {
    await this.page.testSubj.click('lns_colorEditing_trigger');
    await this.page.testSubj.locator('lns-palettePanelFlyout').waitFor({
      state: 'visible',
    });
  }

  /**
   * Closes the open style/settings flyout via the back control.
   * Caller must have that flyout open (back button visible).
   */
  async closeFlyoutWithBackButton() {
    await this.flyoutBackButton.click();
    await this.flyoutBackButton.waitFor({ state: 'hidden' });
  }

  /**
   * Selects a named dynamic-coloring palette (e.g. `status`) from the open palette panel.
   * Distinct from `setPalette`, which toggles legacy vs color-mapping pickers.
   */
  async changePaletteTo(paletteName: string) {
    await this.page.testSubj.click('lnsPalettePanel_dynamicColoring_palette_picker');
    await this.page.testSubj.click(`${paletteName}-palette`);
  }

  async setGaugeShape(value: string) {
    await this.openStyleSettingsFlyout();
    await this.page.components.comboBox('lnsToolbarGaugeAngleType').setSelectedOptions([value]);
    await this.closeFlyoutWithBackButton();
  }

  async setGaugeOrientation(value: 'horizontal' | 'vertical') {
    await this.openStyleSettingsFlyout();
    await this.page.testSubj.click(`lns_gaugeOrientation_${value}Bullet`);
    await this.closeFlyoutWithBackButton();
  }

  /**
   * Sets the gauge minor-label mode (`none` / `custom` / …).
   * Requires the style-settings flyout to already be open; does not open or close it.
   */
  async setGaugeMinorLabelMode(value: string) {
    await this.page.testSubj.locator('lnsToolbarGaugeLabelMinor-select').selectOption(value);
  }

  /** Selects a dynamic-coloring palette range type (`number` or `percent`). */
  async setPaletteRangeType(rangeType: 'number' | 'percent') {
    await this.page.testSubj.click(`lnsPalettePanel_dynamicColoring_rangeType_groups_${rangeType}`);
  }

  /** Sets heatmap/XY axis label orientation from style settings (`horizontal` / `vertical` / `angled`). */
  async setAxisLabelOrientation(orientation: 'horizontal' | 'vertical' | 'angled') {
    await this.page.testSubj.click(`axis_orientation_${orientation}`);
  }

  async setInputValue(testSubj: string, value: string) {
    const input = this.page.locator(`input[data-test-subj="${testSubj}"]`);
    await input.waitFor({ state: 'visible' });
    await input.scrollIntoViewIfNeeded();
    // fill() clears first (avoids "07747" from incomplete selection on number inputs).
    await input.fill(value);
    // Controlled EuiFieldNumber often ignores DOM-only fills — also invoke React onChange
    // with an explicit value (React hijacks input.value so the event must carry it).
    await input.evaluate((el, nextValue) => {
      const inputEl = el as HTMLInputElement & Record<string, unknown>;
      const propsKey = Object.keys(inputEl).find((key) => key.startsWith('__reactProps$'));
      if (!propsKey) {
        return;
      }
      const props = inputEl[propsKey] as {
        onChange?: (e: { target: { value: string }; currentTarget: { value: string } }) => void;
      };
      props.onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } });
    }, value);
    // Sync until React controlled value matches (readiness wait — assertions stay in specs).
    // waitForFunction has no Scout default (unlike expect/actionTimeout).
    await this.page.waitForFunction(
      ({ subj, expected }) => {
        const el = document.querySelector(
          `input[data-test-subj="${subj}"]`
        ) as HTMLInputElement | null;
        return el?.value === expected;
      },
      { subj: testSubj, expected: value },
      { timeout: 10_000 }
    );
    await input.press('Tab');
    // Blur completed — callers must poll a UI side effect (chart debug, dimension label)
    // before closing flyouts; useDebouncedValue (~256ms) has no DOM readiness hook here.
    await this.page.waitForFunction(
      (subj) => {
        const el = document.querySelector(`input[data-test-subj="${subj}"]`);
        return el != null && document.activeElement !== el;
      },
      testSubj,
      { timeout: 10_000 }
    );
  }

  async setEuiSwitch(testSubj: string, checked: boolean) {
    const switchLocator = this.page.testSubj.locator(testSubj);
    await switchLocator.waitFor({ state: 'visible' });
    const want = checked ? 'true' : 'false';
    // EUI switch is React-controlled: Playwright `setChecked` clicks then immediately
    // re-reads aria-checked and fails before Lens commits the update. Click when needed,
    // then wait for the attribute (no expect() in the page object).
    if ((await switchLocator.getAttribute('aria-checked')) !== want) {
      await switchLocator.click();
    }
    await this.page.waitForFunction(
      ([subj, expected]) =>
        document.querySelector(`[data-test-subj="${subj}"]`)?.getAttribute('aria-checked') ===
        expected,
      [testSubj, want] as const,
      { timeout: 10_000 }
    );
  }

  /**
   * Collapses the suggestions panel.
   * Caller must have suggestions mounted with the panel expanded.
   */
  async closeSuggestionPanel() {
    await this.suggestionPanelToggle.waitFor({ state: 'visible' });
    // waitForFunction has no Scout default (unlike expect/actionTimeout).
    await this.page.waitForFunction(
      () =>
        document
          .querySelector('[data-test-subj="lensSuggestionsPanelToggleButton"]')
          ?.getAttribute('aria-expanded') === 'true',
      undefined,
      { timeout: 10_000 }
    );
    await this.suggestionPanelToggle.click();
    await this.page.waitForFunction(
      () => {
        const el = document.querySelector('[data-test-subj="lensSuggestionsPanelToggleButton"]');
        return el == null || el.getAttribute('aria-expanded') !== 'true';
      },
      undefined,
      { timeout: 10_000 }
    );
  }

  /** Waits until the static-value dimension input is visible in the open editor. */
  async waitForStaticValueInput() {
    await this.page.testSubj.locator('lns-indexPattern-static_value-input').waitFor({
      state: 'visible',
    });
  }

  /** Returns visible tag labels from the Lens tag cloud workspace. */
  async getTagCloudTexts(): Promise<string[]> {
    // SVG <text> nodes — use css= so Playwright does not treat "text" as a text-engine query.
    const tags = this.page.testSubj.locator('tagCloudVisualization').locator('css=text');
    return tags.evaluateAll((elements) =>
      elements.map((el) => (el.textContent ?? '').trim()).filter((text) => text.length > 0)
    );
  }

  /** Clicks a tag cloud label matching `tagDisplayText`. */
  async selectTagCloudTag(tagDisplayText: string): Promise<void> {
    const escaped = tagDisplayText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tag = this.page.testSubj
      .locator('tagCloudVisualization')
      .locator('css=text')
      .filter({ hasText: new RegExp(`^${escaped}$`) });
    await tag.waitFor({ state: 'visible' });
    // SVG <text> hit boxes from Elastic Charts are often too thin for Playwright's
    // actionability hit-test; dispatch a DOM click instead of { force: true }.
    await tag.dispatchEvent('click');
  }

  /**
   * Changes the data view in the Lens data panel.
   * Waits for a saved `dataView-{title}` row and fails if it is missing
   * (does not fall back to "Explore matching indices").
   *
   * Does not type into the switcher search box: EuiSelectable filtering races with
   * async option load under CI. Scopes to the :visible switcher because the layer
   * panel also mounts `indexPattern-switcher` (hidden) while the popover is open.
   */
  async switchDataPanelIndexPattern(dataViewTitle: string) {
    const switchLink = this.page.testSubj.locator('lns-dataView-switch-link');
    await switchLink.waitFor({ state: 'visible' });
    if ((await switchLink.innerText()).trim() === dataViewTitle) {
      return;
    }

    await switchLink.click();
    // Layer config also uses `indexPattern-switcher`; only the open popover is visible.
    const switcher = this.page.locator('[data-test-subj="indexPattern-switcher"]:visible');
    await switcher.waitFor({ state: 'visible' });
    const matching = switcher.getByTestId(`dataView-${dataViewTitle}`);
    await matching.waitFor({ state: 'visible' });
    await matching.click();
    await switcher.waitFor({ state: 'hidden' });
    await this.page.testSubj.locator('fieldListLoading').waitFor({ state: 'hidden' });
  }

  /** Maps a caller-facing field id to its internal field-list `data-attr-field`/test-subj suffix. */
  private getFieldAttrName(field: string): string {
    // The document-count field is stored internally as `___records___`; callers pass `records`.
    return field === 'records' ? '___records___' : field;
  }

  private getFieldListPanelFieldLocator(field: string) {
    const attrField = this.getFieldAttrName(field);
    if (field === 'records') {
      // The document-count field always has type `document`, so the field-grouping hook
      // routes it to the special-fields list — a plain <ul> with no container test-subj
      // (unlike Available/Selected Fields, which are rendered as accordions). Match on
      // the attribute directly.
      return this.page.locator(`[data-attr-field="${attrField}"]`);
    }
    // Prefer Available Fields — the same field can also appear under Selected Fields after use.
    return this.page.locator(
      `[data-test-subj="lnsIndexPatternAvailableFields"] [data-attr-field="${attrField}"]`
    );
  }

  /**
   * Geo workspace drop target only mounts after dragstart on a geo field, so
   * Playwright `dragTo` cannot resolve the target up-front. Mirror FTR
   * `html5DragAndDrop`: dispatch dragstart, wait for the geo drop zone, drop.
   */
  async dragFieldToGeoFieldWorkspace(field: string) {
    const fieldLocator = this.getFieldListPanelFieldLocator(field);
    await fieldLocator.waitFor({ state: 'visible' });
    const fieldTestSubj =
      (await fieldLocator.getAttribute('data-test-subj')) ??
      `lnsFieldListPanelField-${this.getFieldAttrName(field)}`;

    await this.page.evaluate((fromSel: string) => {
      interface Transfer {
        data: Record<string, string>;
        setData: (key: string, value: string) => void;
        getData: (key: string) => string;
      }

      function createEvent(typeOfEvent: string) {
        const event = document.createEvent('CustomEvent') as CustomEvent & {
          dataTransfer: Transfer;
        };
        event.initCustomEvent(typeOfEvent, true, true, null);
        event.dataTransfer = {
          data: {},
          setData(key: string, value: string) {
            this.data[key] = value;
          },
          getData(key: string) {
            return this.data[key];
          },
        };
        return event;
      }

      const origin = document.querySelector(`[data-test-subj="${fromSel}"]`);
      if (!origin) {
        throw new Error(`dragFieldToGeoFieldWorkspace: origin not found for ${fromSel}`);
      }
      const dragStartEvent = createEvent('dragstart');
      origin.dispatchEvent(dragStartEvent);
      (window as unknown as { __lensGeoDragTransfer?: Transfer }).__lensGeoDragTransfer =
        dragStartEvent.dataTransfer;
    }, fieldTestSubj);

    const dropTarget = this.page.testSubj.locator('lnsGeoFieldWorkspace');
    await dropTarget.waitFor({ state: 'visible' });

    await this.page.evaluate(() => {
      interface Transfer {
        data: Record<string, string>;
        setData: (key: string, value: string) => void;
        getData: (key: string) => string;
      }
      const transfer = (window as unknown as { __lensGeoDragTransfer?: Transfer })
        .__lensGeoDragTransfer;
      const target = document.querySelector('[data-test-subj="lnsGeoFieldWorkspace"]');
      if (!target || !transfer) {
        throw new Error('dragFieldToGeoFieldWorkspace: drop target or transfer missing');
      }

      function createEvent(typeOfEvent: string) {
        const event = document.createEvent('CustomEvent') as CustomEvent & {
          dataTransfer: Transfer;
        };
        event.initCustomEvent(typeOfEvent, true, true, null);
        event.dataTransfer = transfer!;
        return event;
      }

      target.dispatchEvent(createEvent('dragenter'));
      target.dispatchEvent(createEvent('dragover'));
      target.dispatchEvent(createEvent('drop'));
      delete (window as unknown as { __lensGeoDragTransfer?: Transfer }).__lensGeoDragTransfer;
    });

    await this.waitForLensDragDropToFinish();
  }

  private async waitForLensDragDropToFinish() {
    // Lens DnD active-group class has no data-test-subj; matches FTR html5DragAndDrop settle wait.
    await this.page.locator('.domDragDrop-isActiveGroup').waitFor({ state: 'hidden' });
  }

  /**
   * Reads `@elastic/charts` debug state after the visualization finishes rendering.
   * Requires `enableElasticChartDebug` (or equivalent init script) before navigation.
   */
  async getCurrentChartDebugState(visType: string): Promise<DebugState> {
    await this.waitForVisualization(visType);
    const chart = this.page.testSubj.locator('lnsWorkspace').getByTestId(visType);
    // Elastic Charts status node — no Lens data-test-subj; same signal as FTR / open-in-Lens helpers.
    await chart.locator('.echChartStatus[data-ech-render-complete="true"]').waitFor({
      state: 'attached',
    });
    const debugJson = await chart.locator('.echChartStatus').getAttribute('data-ech-debug-state');
    if (!debugJson) {
      throw new Error('Elastic charts debugState not found — enable chart debug before navigation');
    }
    return JSON.parse(debugJson) as DebugState;
  }

  async switchToQuickFunctions() {
    await this.page.testSubj.click('lens-dimensionTabs-quickFunctions');
  }

  async switchToFormula() {
    await this.page.testSubj.click('lens-dimensionTabs-formula');
  }

  async switchToStaticValue() {
    await this.page.testSubj.click('lens-dimensionTabs-static_value');
  }

  /**
   * Clicks an incompatible quick-function option without waiting for it to become selected.
   * Used to assert Lens keeps the prior formula on incomplete transitions.
   */
  async clickIncompatibleOperation(operation: string) {
    await this.page.testSubj.click(`lns-indexPatternDimension-${operation} incompatible`);
  }

  async toggleFullscreen() {
    await this.page.testSubj.click('lnsFormula-fullscreen');
  }

  /**
   * Focuses the formula Monaco textarea (avoid `{ force: true }` — suggest portals intercept clicks).
   */
  private async focusFormulaEditor() {
    await this.formulaEditorTextarea.waitFor({ state: 'attached' });
    await this.formulaEditorTextarea.evaluate((el) => {
      (el as HTMLTextAreaElement).focus();
    });
  }

  /** Lens formula uses the last registered Monaco model (not always index 0). */
  private async getFormulaModelIndex(): Promise<number> {
    return this.page.evaluate(() => {
      const monacoEnv = (
        window as unknown as {
          MonacoEnvironment?: {
            monaco?: { editor?: { getModels: () => unknown[] } };
          };
        }
      ).MonacoEnvironment;
      const models = monacoEnv?.monaco?.editor?.getModels() ?? [];
      return Math.max(0, models.length - 1);
    });
  }

  /**
   * Types into the formula Monaco editor.
   * Use `replace: true` to clear first (dimension configure). Omit replace to append
   * (autocomplete paths). Lens auto-inserts quotes/parens after some tokens (e.g. `kql=`),
   * so callers should `expect.poll(() => lens.getFormulaText())` for the final value.
   */
  async typeInFormula(text: string, options?: { replace?: boolean; focus?: boolean }) {
    if (options?.focus !== false) {
      await this.focusFormulaEditor();
    }
    if (options?.replace) {
      const modelIndex = await this.getFormulaModelIndex();
      await this.codeEditor.setCodeEditorValue('', modelIndex);
      await this.focusFormulaEditor();
    }
    await this.page.keyboard.type(text, { delay: 25 });
  }

  /** Returns the current formula Monaco model value (last registered model). */
  async getFormulaText(): Promise<string> {
    const modelIndex = await this.getFormulaModelIndex();
    return this.codeEditor.getCodeEditorValue(modelIndex);
  }

  async enableFilter() {
    await this.page.testSubj.click('indexPattern-advanced-accordion');
    await this.page.testSubj.click('indexPattern-filters-existingFilterTrigger');
  }

  async setFilterBy(queryString: string) {
    await this.page.testSubj
      .locator('indexPattern-filters-queryStringInput')
      .pressSequentially(queryString, { delay: 20 });
    await this.page.testSubj.click('indexPattern-filters-existingFilterTrigger');
  }

  /**
   * Adds a visualization layer of the given type (opens the layer-type menu).
   * Caller must use a chart that shows `lnsLayerAddButton-{layerType}` after Add.
   */
  async createLayer(layerType: 'data' | 'referenceLine' | 'annotations') {
    const tabsBefore = await this.getLayerCount();
    await this.page.testSubj.click('lnsLayerAddButton');
    await this.page.testSubj.click(`lnsLayerAddButton-${layerType}`);
    await this.page.waitForFunction(
      (before) => {
        const tabs = document.querySelectorAll('[data-test-subj^="unifiedTabs_tab_"]').length;
        const count = tabs === 0 ? 1 : tabs;
        return count > before;
      },
      tabsBefore,
      { timeout: 10_000 }
    );
  }

  /**
   * HTML5 DnD between test-subj chains (FTR `browser.html5DragAndDrop`).
   * Chains use `>` separators (e.g. `panel > lns-dimensionTrigger`).
   */
  private async html5DragAndDrop(from: string, to: string) {
    await this.page.evaluate(
      async ([fromChain, toChain]) => {
        interface Transfer {
          data: Record<string, string>;
          setData: (key: string, value: string) => void;
          getData: (key: string) => string;
        }

        function createEvent(typeOfEvent: string) {
          const event = document.createEvent('CustomEvent') as CustomEvent & {
            dataTransfer: Transfer;
          };
          event.initCustomEvent(typeOfEvent, true, true, null);
          event.dataTransfer = {
            data: {},
            setData(key: string, value: string) {
              this.data[key] = value;
            },
            getData(key: string) {
              return this.data[key];
            },
          };
          return event;
        }

        function queryChain(chain: string): Element | null {
          const parts = chain.split('>').map((p) => p.trim());
          let nodes: Element[] = [document.body];
          for (const part of parts) {
            const next: Element[] = [];
            for (const node of nodes) {
              next.push(...Array.from(node.querySelectorAll(`[data-test-subj="${part}"]`)));
            }
            nodes = next;
          }
          return nodes[0] ?? null;
        }

        const origin = queryChain(fromChain);
        if (!origin) {
          throw new Error(`html5DragAndDrop: origin not found for ${fromChain}`);
        }

        const dragStartEvent = createEvent('dragstart');
        origin.dispatchEvent(dragStartEvent);

        // FTR browser.html5DragAndDrop pauses ~100ms between dragstart and drop.
        await new Promise((resolve) => setTimeout(resolve, 100));

        const target = queryChain(toChain);
        if (!target) {
          throw new Error(`html5DragAndDrop: target not found for ${toChain}`);
        }

        const dropEvent = createEvent('drop');
        dropEvent.dataTransfer = dragStartEvent.dataTransfer;
        target.dispatchEvent(dropEvent);

        const dragEndEvent = createEvent('dragend');
        dragEndEvent.dataTransfer = dropEvent.dataTransfer;
        origin.dispatchEvent(dragEndEvent);
      },
      [from, to] as [string, string]
    );
  }

  /**
   * HTML5 DnD between dimension triggers/drop targets (FTR `dragDimensionToDimension`).
   * Both `from` and `to` are test-subj chains (e.g. `panel > lns-dimensionTrigger`).
   */
  async dragDimensionToDimension({ from, to }: { from: string; to: string }) {
    // Chains may match multiple nodes (e.g. Y panel with duplicates); wait for presence, not strict unique.
    await this.page.waitForFunction(
      (chain) => {
        const parts = chain.split('>').map((p: string) => p.trim());
        let nodes: Element[] = [document.body];
        for (const part of parts) {
          const next: Element[] = [];
          for (const node of nodes) {
            next.push(...Array.from(node.querySelectorAll(`[data-test-subj="${part}"]`)));
          }
          nodes = next;
        }
        return nodes.length > 0;
      },
      from,
      { timeout: 10_000 }
    );
    await this.page.waitForFunction(
      (chain) => {
        const parts = chain.split('>').map((p: string) => p.trim());
        let nodes: Element[] = [document.body];
        for (const part of parts) {
          const next: Element[] = [];
          for (const node of nodes) {
            next.push(...Array.from(node.querySelectorAll(`[data-test-subj="${part}"]`)));
          }
          nodes = next;
        }
        return nodes.length > 0;
      },
      to,
      { timeout: 10_000 }
    );
    await this.html5DragAndDrop(from, to);
    await this.waitForLensDragDropToFinish();
  }

  /** Drags a field onto a dimension trigger / empty slot (test-subj chain). */
  async dragFieldToDimensionTrigger(field: string, dimension: string) {
    const fieldLocator = this.getFieldListPanelFieldLocator(field);
    await fieldLocator.waitFor({ state: 'visible' });
    const fieldTestSubj =
      (await fieldLocator.getAttribute('data-test-subj')) ??
      `lnsFieldListPanelField-${this.getFieldAttrName(field)}`;
    await this.page.testSubj.locator(dimension).waitFor({ state: 'visible' });
    await this.html5DragAndDrop(fieldTestSubj, dimension);
    await this.waitForLensDragDropToFinish();
  }

  /**
   * Reorders dimensions within a group (1-based indices, FTR `reorderDimensions`).
   * The reorderable drop layer only mounts after dragstart, so the full DnD runs in-page.
   */
  async reorderDimensions(dimension: string, startIndex: number, endIndex: number) {
    await this.page.waitForFunction(
      ({ panelSubj, minCount }) =>
        document.querySelectorAll(`[data-test-subj="${panelSubj}"]`).length >= minCount,
      { panelSubj: dimension, minCount: Math.max(startIndex, endIndex) },
      { timeout: 10_000 }
    );
    await this.page.evaluate(
      async ([panelSubj, startIdx, endIdx]) => {
        interface Transfer {
          data: Record<string, string>;
          setData: (key: string, value: string) => void;
          getData: (key: string) => string;
        }

        function createEvent(typeOfEvent: string) {
          const event = document.createEvent('CustomEvent') as CustomEvent & {
            dataTransfer: Transfer;
          };
          event.initCustomEvent(typeOfEvent, true, true, null);
          event.dataTransfer = {
            data: {},
            setData(key: string, value: string) {
              this.data[key] = value;
            },
            getData(key: string) {
              return this.data[key];
            },
          };
          return event;
        }

        const panels = Array.from(document.querySelectorAll(`[data-test-subj="${panelSubj}"]`));
        const startPanel = panels[startIdx - 1];
        const endPanel = panels[endIdx - 1];
        const origin = startPanel?.querySelector('.domDraggable');
        if (!origin) {
          throw new Error(
            `reorderDimensions: missing origin for ${panelSubj} index ${startIdx} (found ${panels.length} panels)`
          );
        }
        const dragStartEvent = createEvent('dragstart');
        origin.dispatchEvent(dragStartEvent);
        await new Promise((resolve) => setTimeout(resolve, 100));

        const target =
          endPanel?.querySelector(`[data-test-subj="lnsDragDrop-reorderableDropLayer"]`) ?? null;
        if (!target) {
          throw new Error(
            `reorderDimensions: drop layer not found for ${panelSubj} index ${endIdx}`
          );
        }
        const dropEvent = createEvent('drop');
        dropEvent.dataTransfer = dragStartEvent.dataTransfer;
        target.dispatchEvent(dropEvent);
        const dragEndEvent = createEvent('dragend');
        dragEndEvent.dataTransfer = dropEvent.dataTransfer;
        origin.dispatchEvent(dragEndEvent);
      },
      [dimension, startIndex, endIndex] as [string, number, number]
    );
    await this.waitForLensDragDropToFinish();
  }

  /**
   * Drags over a dimension group and drops on an extra target (duplicate/swap/combine).
   * Mirrors FTR `dragEnterDrop` with timed dragenter → drop.
   */
  private async dragEnterDrop(dragging: string, draggedOver: string, dropTarget: string) {
    await this.page.evaluate(
      async ([fromSel, overSel, dropSel]) => {
        interface Transfer {
          data: Record<string, string>;
          setData: (key: string, value: string) => void;
          getData: (key: string) => string;
        }

        function createEvent(typeOfEvent: string) {
          const event = document.createEvent('CustomEvent') as CustomEvent & {
            dataTransfer: Transfer;
          };
          event.initCustomEvent(typeOfEvent, true, true, null);
          event.dataTransfer = {
            data: {},
            setData(key: string, value: string) {
              this.data[key] = value;
            },
            getData(key: string) {
              return this.data[key];
            },
          };
          return event;
        }

        function queryChain(chain: string): Element | null {
          // CSS selector (starts with `[`) or test-subj chain with `>`
          if (chain.trim().startsWith('[')) {
            return document.querySelector(chain);
          }
          const parts = chain.split('>').map((p) => p.trim());
          let nodes: Element[] = [document.body];
          for (const part of parts) {
            const next: Element[] = [];
            for (const node of nodes) {
              next.push(...Array.from(node.querySelectorAll(`[data-test-subj="${part}"]`)));
            }
            nodes = next;
          }
          return nodes[0] ?? null;
        }

        const origin = queryChain(fromSel);
        if (!origin) {
          throw new Error(`dragEnterDrop: origin not found for ${fromSel}`);
        }
        const dragStartEvent = createEvent('dragstart');
        origin.dispatchEvent(dragStartEvent);

        await new Promise((resolve) => setTimeout(resolve, 200));

        const over = queryChain(overSel);
        if (!over) {
          throw new Error(`dragEnterDrop: draggedOver not found for ${overSel}`);
        }
        const dragenter = createEvent('dragenter');
        dragenter.dataTransfer = dragStartEvent.dataTransfer;
        over.dispatchEvent(dragenter);
        const dragover = createEvent('dragover');
        dragover.dataTransfer = dragStartEvent.dataTransfer;
        over.dispatchEvent(dragover);

        await new Promise((resolve) => setTimeout(resolve, 200));

        const target = queryChain(dropSel);
        if (!target) {
          throw new Error(`dragEnterDrop: dropTarget not found for ${dropSel}`);
        }
        const dropEvent = createEvent('drop');
        dropEvent.dataTransfer = dragStartEvent.dataTransfer;
        target.dispatchEvent(dropEvent);
        const dragEndEvent = createEvent('dragend');
        dragEndEvent.dataTransfer = dropEvent.dataTransfer;
        origin.dispatchEvent(dragEndEvent);
      },
      [dragging, draggedOver, dropTarget] as [string, string, string]
    );
  }

  async dragFieldToExtraDropType(
    field: string,
    to: string,
    type: 'duplicate' | 'swap' | 'combine',
    visDataTestSubj?: string
  ) {
    const fieldLocator = this.getFieldListPanelFieldLocator(field);
    await fieldLocator.waitFor({ state: 'visible' });
    const fieldTestSubj =
      (await fieldLocator.getAttribute('data-test-subj')) ??
      `lnsFieldListPanelField-${this.getFieldAttrName(field)}`;
    await this.dragEnterDrop(
      fieldTestSubj,
      `${to} > lnsDragDrop-domDroppable`,
      `${to} > domDragDrop-dropTarget-${type}`
    );
    if (visDataTestSubj) {
      await this.waitForVisualization(visDataTestSubj);
    }
  }

  async dragDimensionToExtraDropType(
    from: string,
    to: string,
    type: 'duplicate' | 'swap' | 'combine',
    visDataTestSubj?: string
  ) {
    await this.page.testSubj.locator(from).waitFor({ state: 'visible' });
    await this.dragEnterDrop(
      from,
      `${to} > lnsDragDrop-domDroppable`,
      `${to} > domDragDrop-dropTarget-${type}`
    );
    if (visDataTestSubj) {
      await this.waitForVisualization(visDataTestSubj);
    }
  }

  /** Active keyboard-DnD drop target key (test-subj or class+text fallback). */
  private async getKeyboardDragActiveKey(): Promise<string> {
    return this.page.evaluate(() => {
      const active = document.querySelector('.domDroppable--active, .domDroppable--hover');
      if (!active) {
        return '';
      }
      return (
        active.getAttribute('data-test-subj') ??
        `${active.className}:${(active.textContent ?? '').slice(0, 40)}`
      );
    });
  }

  /**
   * Pace between Lens keyboard DnD arrow presses (FTR `common.sleep(200)`).
   * Lens does not expose a reliable settle signal here: waiting for
   * `.domDroppable--active` key changes times out on common workspace drops
   * (highlight often updates without a distinct key). Intentional short sleep.
   */
  private async paceKeyboardDragDrop(previousActiveKey?: string): Promise<string> {
    await this.page.waitForTimeout(200);
    return (await this.getKeyboardDragActiveKey()) || previousActiveKey || '';
  }

  /**
   * Keyboard-drags a field onto a drop target by arrow steps (FTR `dragFieldWithKeyboard`).
   */
  async dragFieldWithKeyboard(fieldName: string, steps = 1, reverse = false) {
    const handler = this.page.locator(
      `[data-attr-field="${fieldName}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
    );
    // Prefer available-fields handler when the field is listed twice (selected + available).
    const availableHandler = this.page.locator(
      `[data-test-subj="lnsIndexPatternAvailableFields"] [data-attr-field="${fieldName}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
    );
    const target = (await availableHandler.count()) > 0 ? availableHandler : handler;
    await target.waitFor({ state: 'visible' });
    await target.focus();
    await this.page.keyboard.press('Enter');
    await this.page.waitForFunction(
      () => document.querySelectorAll('.domDroppable--active').length > 0,
      undefined,
      { timeout: 10_000 }
    );
    let activeKey = await this.paceKeyboardDragDrop();
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press(reverse ? 'ArrowLeft' : 'ArrowRight');
      activeKey = await this.paceKeyboardDragDrop(activeKey);
    }
    await this.page.keyboard.press('Enter');
    await this.waitForLensDragDropToFinish();
  }

  /**
   * Keyboard-moves a dimension by arrow steps (FTR `dimensionKeyboardDragDrop`).
   */
  async dimensionKeyboardDragDrop(group: string, index = 0, steps = 1, reverse = false) {
    const handlersLocator = this.page.locator(
      `[data-test-subj="${group}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
    );
    await this.page.waitForFunction(
      ({ groupSubj, min }) =>
        document.querySelectorAll(
          `[data-test-subj="${groupSubj}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
        ).length > min,
      { groupSubj: group, min: index },
      { timeout: 10_000 }
    );
    const handlers = await handlersLocator.all();
    const handler = handlers[index];
    if (!handler) {
      throw new Error(`dimensionKeyboardDragDrop: handler not found at index ${index}`);
    }
    await handler.focus();
    await this.page.keyboard.press('Enter');
    let activeKey = await this.paceKeyboardDragDrop();
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press(reverse ? 'ArrowLeft' : 'ArrowRight');
      activeKey = await this.paceKeyboardDragDrop(activeKey);
    }
    await this.paceKeyboardDragDrop(activeKey);
    await this.page.keyboard.press('Enter');
    await this.waitForLensDragDropToFinish();
  }

  /**
   * Keyboard-reorders a dimension within its group (FTR `dimensionKeyboardReorder`).
   */
  async dimensionKeyboardReorder(group: string, index = 0, steps = 1, reverse = false) {
    const handlersLocator = this.page.locator(
      `[data-test-subj="${group}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
    );
    await this.page.waitForFunction(
      ({ groupSubj, min }) =>
        document.querySelectorAll(
          `[data-test-subj="${groupSubj}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
        ).length > min,
      { groupSubj: group, min: index },
      { timeout: 10_000 }
    );
    const handlers = await handlersLocator.all();
    const handler = handlers[index];
    if (!handler) {
      throw new Error(`dimensionKeyboardReorder: handler not found at index ${index}`);
    }
    await handler.focus();
    await this.page.keyboard.press('Enter');
    let activeKey = await this.paceKeyboardDragDrop();
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press(reverse ? 'ArrowUp' : 'ArrowDown');
      activeKey = await this.paceKeyboardDragDrop(activeKey);
    }
    await this.paceKeyboardDragDrop(activeKey);
    await this.page.keyboard.press('Enter');
    await this.waitForLensDragDropToFinish();
  }

  /** Filters the field list (FTR `searchField`). */
  async searchField(name: string) {
    const input = this.page.testSubj.locator('lnsIndexPatternFieldSearch');
    await input.waitFor({ state: 'visible' });
    await input.fill('');
    await this.page.testSubj.typeWithDelay('lnsIndexPatternFieldSearch', name, { delay: 30 });
  }

  /**
   * Removes/resets a layer (FTR `removeLayer`). With a single layer this resets the viz.
   */
  async removeLayer(index = 0) {
    const tabsLocator = this.page.locator('[data-test-subj^="unifiedTabs_tab_"]');
    const tabs = await tabsLocator.all();
    if (tabs[index]) {
      await tabs[index].hover();
    }
    const splitButton = this.page.testSubj.locator(`lnsLayerSplitButton--${index}`);
    if (await splitButton.isVisible()) {
      await splitButton.click();
    }
    await this.page.testSubj.click(`lnsLayerRemove--${index}`);
    const modal = this.page.testSubj.locator('lnsLayerRemoveModal');
    if (await modal.isVisible()) {
      await this.page.testSubj.click('lnsLayerRemoveConfirmButton');
    }
  }

  /**
   * Ensures the layer tab is active when multiple layers exist (FTR `ensureLayerTabIsActive`).
   * No-op when the tab bar is hidden (single layer).
   */
  async ensureLayerTabIsActive(index = 0) {
    const tabsLocator = this.page.locator('[data-test-subj^="unifiedTabs_tab_"]');
    if ((await tabsLocator.count()) === 0) {
      return;
    }
    const tabs = await tabsLocator.all();
    const tab = tabs[index];
    if (!tab) {
      throw new Error(`ensureLayerTabIsActive: tab not found at index ${index}`);
    }
    if ((await tab.getAttribute('aria-selected')) === 'true') {
      await this.page.testSubj.locator(`lns-layerPanel-${index}`).waitFor({ state: 'visible' });
      return;
    }
    await this.activateLayerTab(index);
  }

  /** Returns whether the open dimension editor has top-level aggregation enabled. */
  async isTopLevelAggregation(): Promise<boolean> {
    const nestingSwitch = this.page.testSubj.locator('indexPattern-nesting-switch');
    await nestingSwitch.waitFor({ state: 'visible' });
    return nestingSwitch.isChecked();
  }

  /** Focused field list item — name + test-subj for keyboard-DnD assertions (FTR `assertFocusedField`). */
  async getFocusedField(): Promise<{ name: string; testSubj: string | null }> {
    return this.page.evaluate(() => {
      const input = document.activeElement as HTMLElement | null;
      if (!input) {
        return { name: '', testSubj: null };
      }
      // FTR: activeElement parent holds `data-test-subj="lnsFieldListPanelField"`.
      const parent = input.parentElement;
      let fieldEl: HTMLElement | null = input;
      while (fieldEl && !fieldEl.getAttribute('data-attr-field')) {
        fieldEl = fieldEl.parentElement;
      }
      return {
        name: fieldEl?.getAttribute('data-attr-field') ?? '',
        testSubj: parent?.getAttribute('data-test-subj') ?? null,
      };
    });
  }

  /** Visible text of the focused field list item (for keyboard-DnD assertions). */
  async getFocusedFieldName(): Promise<string> {
    return (await this.getFocusedField()).name;
  }

  /** Visible text of the focused dimension trigger (for keyboard-DnD assertions). */
  async getFocusedDimensionLabel(): Promise<string> {
    return this.page.evaluate(() => {
      const input = document.activeElement;
      if (!input) {
        return '';
      }
      const dimension = input.parentElement?.parentElement;
      return (dimension?.textContent ?? '').replace(/\u200b/g, '').trim();
    });
  }

  async getWorkspaceErrorCount(): Promise<number> {
    const errors = this.page.testSubj.locator('lnsWorkspaceErrors');
    if ((await errors.count()) === 0) {
      return 0;
    }
    const pagination = this.page.testSubj.locator('lnsWorkspaceErrorsPaginationControl');
    if ((await pagination.count()) === 0) {
      return 1;
    }
    // EUI pagination buttons use data-test-subj pagination-button-{n} (exclude prev/next).
    return pagination.locator('[data-test-subj^="pagination-button-"]').count();
  }

  /**
   * Locator for a Lens datatable cell. Prefer `expect(locator).toContainText(...)`
   * over `expect.poll` + `getDatatableCellText` when asserting visible values.
   */
  getDatatableCellLocator(rowIndex = 0, colIndex = 0, addRowNumberColumn = true) {
    const col = colIndex + (addRowNumberColumn ? 1 : 0);
    return this.dataTable.locator(
      `[data-test-subj="dataGridRowCell"][data-gridcell-column-index="${col}"][data-gridcell-visible-row-index="${rowIndex}"]`
    );
  }

  private datatableCell(rowIndex: number, colIndex: number, addRowNumberColumn: boolean) {
    return this.getDatatableCellLocator(rowIndex, colIndex, addRowNumberColumn);
  }

  private parseInlineStyle(styleString: string): Record<string, string> {
    return styleString.split(';').reduce<Record<string, string>>((memo, cssLine) => {
      const [prop, value] = cssLine.split(':');
      if (prop && value) {
        memo[prop.trim()] = value.trim();
      }
      return memo;
    }, {});
  }

  async getDatatableCellText(
    rowIndex = 0,
    colIndex = 0,
    addRowNumberColumn = true
  ): Promise<string> {
    const cell = this.datatableCell(rowIndex, colIndex, addRowNumberColumn);
    await cell.waitFor({ state: 'visible' });
    // EUI data grid can append expand/filter glyphs (↵, ↦) / extra whitespace in innerText.
    return ((await cell.innerText()) ?? '')
      .replace(/[\u21b5\u21a6\u2192]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getDatatableCellStyle(
    rowIndex = 0,
    colIndex = 0,
    addRowNumberColumn = true
  ): Promise<Record<string, string>> {
    const cell = this.datatableCell(rowIndex, colIndex, addRowNumberColumn);
    await cell.waitFor({ state: 'visible' });
    return this.parseInlineStyle((await cell.getAttribute('style')) ?? '');
  }

  async getCountOfDatatableColumns(): Promise<number> {
    // FTR parity: EuiDataGrid has no per-column test subj for content cells; `.euiDataGridHeaderCell__content`
    // excludes the leading control column (same selector as FTR `getCountOfDatatableColumns`).
    return this.dataTable.locator('.euiDataGridHeaderCell__content').count();
  }

  async getDatatableHeaderText(index = 0): Promise<string> {
    // Prefer content nodes — columnheader innerText can include action glyphs like ↵.
    // Index matches getCountOfDatatableColumns (control column excluded).
    // FTR parity: EUI class selector until Lens exposes header content test subjects.
    const headers = this.dataTable.locator('.euiDataGridHeaderCell__content');
    await this.page.waitForFunction(
      ({ minCount }) =>
        document.querySelectorAll('[data-test-subj="lnsDataTable"] .euiDataGridHeaderCell__content')
          .length > minCount,
      { minCount: index },
      // waitForFunction has no Scout default (unlike expect/actionTimeout).
      { timeout: 10_000 }
    );
    const headerContents = await headers.all();
    const headerContent = headerContents[index];
    if (!headerContent) {
      throw new Error(`Datatable header not found at index ${index}`);
    }
    return (await headerContent.innerText()).replace(/\s+/g, ' ').trim();
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
        // Palette stops can take several debounce cycles to stabilize after edits.
        { intervals: [500], timeout: 20_000 }
      )
      .toBe(true);

    return readColorStops();
  }
}
