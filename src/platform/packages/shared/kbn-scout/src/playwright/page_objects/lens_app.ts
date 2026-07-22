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
  private readonly goBackToAppButton;
  private readonly discardChangesModal;
  private readonly confirmModalConfirmButton;

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
    this.goBackToAppButton = this.page.testSubj.locator('lnsApp_goBackToAppButton');
    this.discardChangesModal = this.page.testSubj.locator('lnsApp_discardChangesModalOrigin');
    this.confirmModalConfirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
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
    await this.page.testSubj.locator(`lnsChartSwitchPopover_${visType}`).click();
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

  async confirmDiscardChangesModal() {
    await this.discardChangesModal.waitFor({ state: 'visible' });
    await this.confirmModalConfirmButton.click();
  }

  /**
   * Opens the Lens save modal, fills in the title, optionally selects
   * a dashboard target, and confirms.
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
    await expect(this.saveModal).toBeHidden();
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
    keepOpen?: boolean;
    isPreviousIncompatible?: boolean;
  }) {
    await this.openDimensionSelector(opts.dimension);
    await this.selectOperation(opts.operation, opts.isPreviousIncompatible);
    if (opts.field) {
      await this.selectField(opts.field);
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

  async setTermsNumberOfValues(value: number) {
    // ValuesInput debounces parent updates; Playwright DOM fills often never reach React.
    // Call ValuesInput's numeric onChange via the fiber tree so params.size commits.
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
      { timeout: 10_000 }
    );
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

  async dragFieldToWorkspace(field: string) {
    const fieldLocator = this.page.testSubj.locator(`lnsFieldListPanelField-___${field}___`);
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

  /** Returns all dimension-trigger button locators currently rendered in the editor. */
  getDimensionTriggers() {
    return this.getDimensionTriggerLocator().all();
  }

  /** Returns visible labels for all dimension triggers inside a dimension panel. */
  private async getDimensionTriggersTexts(dimension: string): Promise<string[]> {
    const triggersLocator = this.page.testSubj.locator(`${dimension} > lns-dimensionTrigger`);
    await this.page.waitForFunction(
      (panel) => {
        const root = document.querySelector(`[data-test-subj="${panel}"]`);
        return (root?.querySelectorAll('[data-test-subj="lns-dimensionTrigger"]').length ?? 0) > 0;
      },
      dimension,
      // waitForFunction has no Scout default (unlike expect/actionTimeout).
      { timeout: 10_000 }
    );

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
    await switchLocator.setChecked(checked);
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
   * After filtering, either a saved `dataView-{title}` row or "Explore matching indices" appears.
   */
  async switchDataPanelIndexPattern(dataViewTitle: string) {
    const switchLink = this.page.testSubj.locator('lns-dataView-switch-link');
    await switchLink.click();
    const switcher = this.page.testSubj.locator('indexPattern-switcher');
    await switcher.waitFor({ state: 'visible' });
    await this.page.testSubj.typeWithDelay('indexPattern-switcher--input', dataViewTitle);
    const matching = switcher.locator(`[data-test-subj="dataView-${dataViewTitle}"]`);
    const exploreMatching = this.page.testSubj.locator('explore-matching-indices-button');
    await matching.or(exploreMatching).waitFor({ state: 'visible' });
    if (await matching.isVisible()) {
      await matching.click();
    } else {
      await exploreMatching.click();
    }
    await switcher.waitFor({ state: 'hidden' });
  }

  private getFieldListPanelFieldLocator(field: string) {
    // Prefer the encoded unified-field-list id used by existing Scout DnD, then fall back.
    const encoded = this.page.testSubj.locator(`lnsFieldListPanelField-___${field}___`);
    return encoded.or(this.page.testSubj.locator(`lnsFieldListPanelField-${field}`));
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
      (await fieldLocator.getAttribute('data-test-subj')) ?? `lnsFieldListPanelField-${field}`;

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

  async getCountOfDatatableColumns(): Promise<number> {
    // FTR parity: EuiDataGrid has no per-column test subj for content cells; `.euiDataGridHeaderCell__content`
    // excludes the leading control column (same selector as FTR `getCountOfDatatableColumns`).
    return this.page
      .locator('[data-test-subj="lnsDataTable"] .euiDataGridHeaderCell__content')
      .count();
  }

  async getDatatableHeaderText(index = 0): Promise<string> {
    // Prefer content nodes — columnheader innerText can include action glyphs like ↵.
    // Index matches getCountOfDatatableColumns (control column excluded).
    // FTR parity: EUI class selector until Lens exposes header content test subjects.
    const headers = this.page.locator(
      '[data-test-subj="lnsDataTable"] .euiDataGridHeaderCell__content'
    );
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
