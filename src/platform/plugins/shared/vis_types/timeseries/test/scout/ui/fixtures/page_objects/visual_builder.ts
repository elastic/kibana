/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DebugState } from '@elastic/charts';
import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

type PanelType = 'timeSeries' | 'metric' | 'topN' | 'table' | 'gauge' | 'markdown';
type EditorTab = 'Data' | 'PanelOptions' | 'Annotations';
type DataFormatter = 'default' | 'bytes' | 'number' | 'percent' | 'duration' | 'custom';
type ChartType = 'Bar' | 'Line';

type Duration =
  | 'Milliseconds'
  | 'Seconds'
  | 'Minutes'
  | 'Hours'
  | 'Days'
  | 'Weeks'
  | 'Months'
  | 'Years';
type FromDuration = Duration | 'Picoseconds' | 'Nanoseconds' | 'Microseconds';
type ToDuration = Duration | 'Human readable';

/** Field option lists are fetched from Elasticsearch, so they need a longer window than the combo box default. */
const SERVER_BACKED_COMBO_BOX_TIMEOUT = 20_000;
const RENDER_TIMEOUT = 30_000;

/**
 * TSVB hands a model change to the preview a 200ms debounce later and dispatches more
 * than one render pass per change, so the preview only counts as settled once its
 * render count has stopped moving for longer than that debounce.
 */
const PREVIEW_SETTLED_MS = 1_000;
const PREVIEW_POLL_INTERVAL_MS = 100;

/**
 * Selectors for the elements TSVB renders more than once (one per series, agg row
 * or filter row), which therefore have to be addressed by position.
 */
const REPEATED = {
  legendValue: '.echLegendItem .echLegendItem__legendValue',
  seriesOptionsTab: '[data-test-subj="seriesOptions"]',
  cloneSeriesButton: '[data-test-subj="AddCloneBtn"]',
  togglePanelPreviewButton: '[data-test-subj="AddActivatePanelBtn"]',
  aggRow: '[data-test-subj="aggRow"]',
  groupByFilterQueryBar: '[data-test-subj="filterItemsQueryBar"]',
  groupByFilterLabel: '[data-test-subj="filterItemsLabel"]',
  colorPickerAnchor: '[data-test-subj="euiColorPickerAnchor"]',
  /** A chart stacks several canvases, the top one receives the clicks. */
  chartCanvas: '.echChart canvas:last-of-type',
} as const;

/**
 * Picks the match at `index` through Playwright's positional selector, the form the
 * `playwright/no-nth-methods` rule leaves available. Position is what the elements
 * above have to be told apart by, since each of them is the same component repeated
 * under one `data-test-subj`.
 */
const at = (selector: string, index: number) => `${selector} >> nth=${index}`;

/**
 * Page object for the TSVB (Visual Builder) editor and its Time Series preview.
 */
export class VisualBuilder {
  readonly editor: Locator;
  readonly timeSeriesChart: Locator;
  readonly chartLegend: Locator;
  readonly legendItems: Locator;
  readonly seriesEditors: Locator;
  readonly visualizationError: Locator;
  readonly colorPickerPopover: Locator;
  readonly indexPatternSelectionModeSwitch: Locator;
  readonly chartCanvas: Locator;
  private readonly preview: Locator;
  private readonly chartStatus: Locator;
  private readonly renderedChartStatus: Locator;
  private readonly indexPatternSelectionModePopover: Locator;

  constructor(private readonly page: ScoutPage) {
    this.editor = this.page.testSubj.locator('tvbVisEditor');
    this.timeSeriesChart = this.page.locator('.tvbVisTimeSeries');
    this.chartLegend = this.page.locator('.echLegend');
    this.legendItems = this.page.locator('.echLegendItem');
    this.seriesEditors = this.page.locator('.tvbSeriesEditor');
    this.visualizationError = this.page.testSubj.locator('visualization-error');
    this.colorPickerPopover = this.page.testSubj.locator('euiColorPickerPopover');
    this.chartCanvas = this.page.locator(at(REPEATED.chartCanvas, 0));
    this.preview = this.page.testSubj.locator('visualizationLoader');
    this.chartStatus = this.page.locator('.tvbVisTimeSeries .echChartStatus');
    this.renderedChartStatus = this.page.locator(
      '.tvbVisTimeSeries .echChartStatus[data-ech-render-complete="true"]'
    );
    this.indexPatternSelectionModeSwitch = this.page.testSubj.locator(
      'switchIndexPatternSelectionMode'
    );
    this.indexPatternSelectionModePopover = this.page.testSubj.locator(
      'switchIndexPatternSelectionModePopoverContent'
    );
  }

  async waitForEditorLoaded() {
    await this.editor.waitFor({ state: 'visible', timeout: RENDER_TIMEOUT });
  }

  /** Waits for the Time Series preview to complete a render pass. */
  async waitForChartRenderComplete() {
    await this.renderedChartStatus.waitFor({ state: 'attached', timeout: RENDER_TIMEOUT });
  }

  /** Re-runs the query from the global search bar. */
  async refresh() {
    await this.applyAndWaitForRerender(() => this.page.testSubj.click('querySubmitButton'));
  }

  // ============================================================
  // Editor tabs
  // ============================================================

  async clickDataTab(panelType: PanelType) {
    await this.switchEditorTab(panelType, 'Data');
  }

  async clickPanelOptions(panelType: PanelType) {
    await this.switchEditorTab(panelType, 'PanelOptions');
  }

  async clickAnnotationsTab() {
    await this.switchEditorTab('timeSeries', 'Annotations');
  }

  private async switchEditorTab(panelType: PanelType, tab: EditorTab) {
    const tabButton = this.page.testSubj.locator(`${panelType}Editor${tab}Btn`);
    await tabButton.click();
    await expect(tabButton).toHaveAttribute('aria-selected', 'true');
  }

  // ============================================================
  // Panel options
  // ============================================================

  async setDropLastBucket(value: boolean) {
    await this.setYesNo('metricsDropLastBucket', value);
  }

  async setOverrideIndexPattern(value: boolean) {
    await this.setYesNo('seriesOverrideIndexPattern', value);
  }

  async setIntervalValue(interval: string) {
    await this.applyAndWaitForRerender(() =>
      this.page.testSubj.locator('metricsIndexPatternInterval').fill(interval)
    );
  }

  async setIndexPatternValue(dataViewName: string) {
    await this.applyAndWaitForRerender(() =>
      this.page.components
        .comboBox('metricsIndexPatternInput')
        .setSelectedOptions([dataViewName], { timeout: SERVER_BACKED_COMBO_BOX_TIMEOUT })
    );
  }

  async setPanelFilter(query: string) {
    await this.applyAndWaitForRerender(() =>
      this.fillQueryBar(this.page.testSubj.locator('panelFilterQueryBar'), query)
    );
  }

  private async setYesNo(testSubj: string, value: boolean) {
    const radio = this.page.testSubj.locator(`${testSubj}-${value ? 'yes' : 'no'}`);
    const input = radio.locator('input');
    if (await input.isChecked()) {
      return;
    }
    await this.applyAndWaitForRerender(async () => {
      await radio.locator('label').click();
      await expect(input).toBeChecked();
    });
  }

  // ============================================================
  // Series
  // ============================================================

  async clickSeriesOption(nth = 0) {
    await this.page.locator(at(REPEATED.seriesOptionsTab, nth)).click();
  }

  async enterOffsetSeries(offset: string) {
    await this.applyAndWaitForRerender(() =>
      this.page.testSubj.locator('offsetTimeSeries').fill(offset)
    );
  }

  async setSeriesFilter(query: string) {
    await this.applyAndWaitForRerender(() =>
      this.fillQueryBar(this.page.testSubj.locator('seriesConfigQueryBar'), query)
    );
  }

  async setChartType(chartType: ChartType) {
    await this.applyAndWaitForRerender(() =>
      this.page.components.comboBox('seriesChartTypeComboBox').setSelectedOptions([chartType])
    );
  }

  async cloneSeries(nth = 0) {
    const seriesCount = await this.seriesEditors.count();
    await this.applyAndWaitForRerender(async () => {
      await this.page.locator(at(REPEATED.cloneSeriesButton, nth)).click();
      await expect(this.seriesEditors).toHaveCount(seriesCount + 1);
    });
  }

  /** Toggles the "temporarily disable"/"re-enable" state of a series panel. */
  async togglePanelPreview(nth = 0) {
    await this.page.locator(at(REPEATED.togglePanelPreviewButton, nth)).click();
  }

  /** Legend value of the nth series, e.g. the aggregated count rendered next to its label. */
  async getLegendValue(nth = 0): Promise<string> {
    await this.waitForChartRenderComplete();
    const legendValue = this.page.locator(at(REPEATED.legendValue, nth));
    await legendValue.hover();
    return (await legendValue.innerText()).trim();
  }

  async clickSeriesLegendItem(seriesName: string) {
    await this.page.locator(`[data-ech-series-name="${seriesName}"] .echLegendItem__label`).click();
  }

  // ============================================================
  // Aggregations
  // ============================================================

  async selectAggType(aggType: string, aggNth = 0) {
    await this.applyAndWaitForRerender(() =>
      this.page.components
        .comboBox('aggSelectorComboBox', this.aggRow(aggNth))
        .setSelectedOptions([aggType])
    );
  }

  async setFieldForAggregation(field: string, aggNth = 0) {
    await this.applyAndWaitForRerender(() =>
      this.page.components
        .comboBox('fieldSelectItem', this.aggRow(aggNth))
        .setSelectedOptions([field], { timeout: SERVER_BACKED_COMBO_BOX_TIMEOUT })
    );
  }

  private aggRow(nth: number): Locator {
    return this.page.locator(at(REPEATED.aggRow, nth));
  }

  // ============================================================
  // Group by
  // ============================================================

  async setMetricsGroupBy(mode: 'Everything' | 'Filter' | 'Filters' | 'Terms') {
    await this.applyAndWaitForRerender(() =>
      this.page.components.comboBox('groupBySelect').setSelectedOptions([mode])
    );
  }

  async setMetricsGroupByTerms(
    field: string,
    filtering: { include?: string; exclude?: string } = {}
  ) {
    await this.setMetricsGroupBy('Terms');
    await this.setGroupByTermsField(field, this.groupByFieldSelect);

    const { include, exclude } = filtering;
    if (include !== undefined) {
      await this.applyAndWaitForRerender(() =>
        this.page.testSubj.locator('groupByInclude').fill(include)
      );
    }
    if (exclude !== undefined) {
      await this.applyAndWaitForRerender(() =>
        this.page.testSubj.locator('groupByExclude').fill(exclude)
      );
    }
  }

  /** Adds one more "split by terms" field to the series and selects `field` in it. */
  async setAnotherGroupByTermsField(field: string) {
    // The list renders as draggable rows as soon as it holds more than one field,
    // so the row of the field selected first only exists after the new one is added.
    await this.applyAndWaitForRerender(() =>
      this.groupByFieldSelect.getByTestId('fieldSelectItemAddBtn').click()
    );
    const addedFieldRow = this.groupByFieldSelect.getByTestId('multiFieldSelectRow-1');
    await expect(addedFieldRow).toBeVisible();

    await this.setGroupByTermsField(field, addedFieldRow);
  }

  async addGroupByFilterRow() {
    const filterQueryBars = this.page.testSubj.locator('filterItemsQueryBar');
    const rowCount = await filterQueryBars.count();
    await this.applyAndWaitForRerender(async () => {
      await this.page.testSubj.click('filterRowAddBtn');
      await expect(filterQueryBars).toHaveCount(rowCount + 1);
    });
  }

  async setGroupByFilterQuery(query: string, nth = 0) {
    await this.applyAndWaitForRerender(() =>
      this.fillQueryBar(this.page.locator(at(REPEATED.groupByFilterQueryBar, nth)), query)
    );
  }

  async setGroupByFilterLabel(label: string, nth = 0) {
    await this.applyAndWaitForRerender(() =>
      this.page.locator(at(REPEATED.groupByFilterLabel, nth)).fill(label)
    );
  }

  private get groupByFieldSelect(): Locator {
    return this.page.testSubj.locator('groupByField');
  }

  private async setGroupByTermsField(field: string, scope: Locator) {
    await this.applyAndWaitForRerender(() =>
      this.page.components
        .comboBox('fieldSelectItem', scope)
        .setSelectedOptions([field], { timeout: SERVER_BACKED_COMBO_BOX_TIMEOUT })
    );
  }

  // ============================================================
  // Formatters
  // ============================================================

  async changeDataFormatter(formatter: DataFormatter) {
    await this.applyAndWaitForRerender(async () => {
      await this.page.testSubj.click('tsvbDataFormatPicker');
      await this.page.testSubj.click(`tsvbDataFormatPicker-${formatter}`);
    });
  }

  /** Template applied to the series value, must contain `{{value}}`. */
  async enterSeriesTemplate(template: string) {
    await this.applyAndWaitForRerender(() =>
      this.page.testSubj.locator('tsvb_series_value').fill(template)
    );
  }

  async setDurationFormatterSettings({
    from,
    to,
    decimalPlaces,
  }: {
    from?: FromDuration;
    to?: ToDuration;
    decimalPlaces?: string;
  }) {
    // One gate around all three: a setting that already holds its target value is
    // a no-op, so gating each of them separately would wait for a render that the
    // editor has no reason to run.
    await this.applyAndWaitForRerender(async () => {
      if (from) {
        await this.page.components
          .comboBox('dataFormatPickerDurationFrom')
          .setSelectedOptions([from]);
      }
      if (to) {
        await this.page.components.comboBox('dataFormatPickerDurationTo').setSelectedOptions([to]);
      }
      if (decimalPlaces) {
        await this.page.testSubj.locator('dataFormatPickerDurationDecimal').fill(decimalPlaces);
      }
    });
  }

  // ============================================================
  // Colors
  // ============================================================

  async clickColorPicker(nth = 0) {
    await this.page.locator(at(REPEATED.colorPickerAnchor, nth)).click();
  }

  async setColorPickerValue(colorHex: string, nth = 0) {
    await this.clickColorPicker(nth);
    await expect(this.colorPickerPopover).toBeVisible();
    await this.applyAndWaitForRerender(() =>
      this.page.testSubj.locator('euiColorPickerInput_top').fill(colorHex)
    );
    // The re-render can close the popover on its own, so it is only dismissed when
    // it is still open — clicking the anchor again would otherwise re-open it.
    if (await this.colorPickerPopover.isVisible()) {
      await this.clickColorPicker(nth);
      await expect(this.colorPickerPopover).toBeHidden();
    }
  }

  // ============================================================
  // Annotations
  // ============================================================

  async clickAnnotationsAddDataSourceButton() {
    await this.page.testSubj.click('addDataSourceButton');
  }

  async setAnnotationFilter(query: string) {
    await this.fillQueryBar(this.page.testSubj.locator('annotationQueryBar'), query);
  }

  async setAnnotationFields(fields: string) {
    await this.page.testSubj.locator('annotationFieldsInput').fill(fields);
  }

  async setAnnotationRowTemplate(template: string) {
    await this.page.testSubj.locator('annotationRowTemplateInput').fill(template);
  }

  // ============================================================
  // Data view selection mode
  // ============================================================

  async openIndexPatternSelectionModePopover() {
    if (await this.indexPatternSelectionModePopover.isVisible()) {
      return;
    }
    await this.page.testSubj.click('switchIndexPatternSelectionModePopoverButton');
    await expect(this.indexPatternSelectionModePopover).toBeVisible();
  }

  async closeIndexPatternSelectionModePopover() {
    if (!(await this.indexPatternSelectionModePopover.isVisible())) {
      return;
    }
    await this.page.testSubj.click('switchIndexPatternSelectionModePopoverButton');
    await expect(this.indexPatternSelectionModePopover).toBeHidden();
  }

  async switchIndexPatternSelectionMode(useKibanaIndices: boolean) {
    await this.openIndexPatternSelectionModePopover();
    if (
      (await this.indexPatternSelectionModeSwitch.getAttribute('aria-checked')) ===
      String(useKibanaIndices)
    ) {
      await this.closeIndexPatternSelectionModePopover();
      return;
    }
    // Switching the mode resets the data view to the default one, so the preview
    // re-queries and the select is swapped for the other variant — which unmounts
    // the popover, and the switch with it.
    await this.applyAndWaitForRerender(() => this.indexPatternSelectionModeSwitch.click());
    await expect(this.indexPatternSelectionModePopover).toBeHidden();
    // The click updates the form right away, but the editor only adopts the new mode
    // a debounce later, when it writes the model into the app state in the URL. Until
    // then a reload or a navigation drops the change, so the URL is what proves the
    // switch stuck.
    await expect(this.page).toHaveURL(
      new RegExp(`use_kibana_indexes:!${useKibanaIndices ? 't' : 'f'}`)
    );
  }

  // ============================================================
  // Chart debug state
  // ============================================================

  /**
   * Reads the `@elastic/charts` debug state of the Time Series preview. Requires
   * `enableElasticChartDebug()` to have run before the page was loaded.
   */
  async getChartDebugState(): Promise<DebugState> {
    await this.waitForChartRenderComplete();
    const debugJson = await this.chartStatus.getAttribute('data-ech-debug-state');
    if (!debugJson) {
      throw new Error(
        'Elastic charts debugState not found — call enableElasticChartDebug() before navigation'
      );
    }
    return JSON.parse(debugJson) as DebugState;
  }

  // ============================================================
  // Internals
  // ============================================================

  /**
   * Query bars open an autocomplete popover while typing, which can swallow the
   * next click; blurring both commits the query and dismisses the popover.
   */
  private async fillQueryBar(queryBar: Locator, query: string) {
    await queryBar.clear();
    await queryBar.pressSequentially(query);
    await queryBar.blur();
  }

  /**
   * Runs a change that makes the preview re-query, and waits until it has
   * rendered the result.
   *
   * TSVB hands model changes to the preview after a short debounce, re-queries
   * Elasticsearch and re-renders the editor form once the response arrives. That
   * re-render remounts the form controls, so a dropdown opened or a click issued
   * in the meantime is discarded without a trace. Waiting for the render pass the
   * change triggers leaves the editor settled for the next interaction, and takes
   * the place of the sleeps the migrated FTR suite needed for the same reason.
   *
   * Only usable for changes the model actually adopts: setting a control to the
   * value it already holds does not make the preview render again. And a completed
   * render pass leaves the editor usable but does not prove that the change reached
   * the vis state — anything that reloads the page has to check the URL for that.
   */
  private async applyAndWaitForRerender(change: () => Promise<void>) {
    const renderCount = await this.getPreviewRenderCount();
    await change();
    await this.waitForPreviewSettled(renderCount);
  }

  /**
   * Waits until the preview has rendered past `minRenderCount` and has no further
   * render pass pending.
   *
   * Waiting for a single pass is not enough: the preview renders more than once per
   * change, so a pass still in flight can land while the next interaction is under
   * way, remount the form control it targets and detach the node the click has
   * already resolved.
   */
  private async waitForPreviewSettled(minRenderCount: number) {
    let lastCount = minRenderCount;
    let stableSince: number | null = null;

    await expect
      .poll(
        async () => {
          const isComplete = (await this.preview.getAttribute('data-render-complete')) === 'true';
          const count = await this.getPreviewRenderCount();
          const now = Date.now();

          // A count that dropped below the baseline means the preview remounted and
          // reset its counter, which is a render pass just the same.
          if (!isComplete || count === minRenderCount) {
            stableSince = null;
            return false;
          }
          if (count !== lastCount) {
            lastCount = count;
            stableSince = now;
            return false;
          }
          stableSince ??= now;
          return now - stableSince >= PREVIEW_SETTLED_MS;
        },
        {
          message: `The TSVB preview did not settle within ${RENDER_TIMEOUT}ms`,
          timeout: RENDER_TIMEOUT,
          intervals: [PREVIEW_POLL_INTERVAL_MS],
        }
      )
      .toBe(true);
  }

  /**
   * Number of render passes the preview has completed since it was mounted. Read
   * from the container rather than from the chart, because a panel that has no
   * data to plot renders a "No results found" placeholder instead of a chart, and
   * that counts as a render pass just the same.
   */
  private async getPreviewRenderCount(): Promise<number> {
    return Number(await this.preview.getAttribute('data-rendering-count'));
  }
}
