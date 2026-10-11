/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { decode } from '@kbn/rison';
import type { DebugState } from '@elastic/charts';
import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

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

export class VisualBuilderPageObject extends FtrService {
  private readonly find = this.ctx.getService('find');
  private readonly browser = this.ctx.getService('browser');
  private readonly monacoEditor = this.ctx.getService('monacoEditor');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly comboBox = this.ctx.getService('comboBox');
  private readonly elasticChart = this.ctx.getService('elasticChart');
  private readonly header = this.ctx.getPageObject('header');
  private readonly timePicker = this.ctx.getPageObject('timePicker');
  private readonly visChart = this.ctx.getPageObject('visChart');
  private readonly visualize = this.ctx.getPageObject('visualize');

  public async resetPage(
    fromTime = 'Sep 19, 2015 @ 06:31:44.000',
    toTime = 'Sep 22, 2015 @ 18:31:44.000'
  ) {
    await this.visualize.navigateToNewVisualization();
    await this.visualize.clickVisualBuilder();
    await this.checkVisualBuilderIsPresent();
    await this.setTime(fromTime, toTime);
  }

  public async setTime(
    fromTime = 'Sep 19, 2015 @ 06:31:44.000',
    toTime = 'Sep 22, 2015 @ 18:31:44.000'
  ) {
    await this.timePicker.setAbsoluteRange(fromTime, toTime);
  }

  public async checkTabIsLoaded(testSubj: string, name: string) {
    let isPresent = false;
    await this.retry.try(async () => {
      isPresent = await this.testSubjects.waitForExists(testSubj, { timeout: 20000 });
      if (!isPresent) {
        isPresent = await this.testSubjects.waitForExists('visNoResult', { timeout: 1000 });
      }
    });
    if (!isPresent) {
      throw new Error(`TSVB ${name} tab is not loaded`);
    }
  }

  private async toggleYesNoSwitch(
    testSubj: string,
    value: boolean,
    panelModelKey?: 'drop_last_bucket'
  ) {
    const selector = `${testSubj}-${value ? 'yes' : 'no'}`;
    const option = await this.testSubjects.find(selector);
    const input = await option.findByCssSelector('input');
    const isChanged = !(await input.isSelected());
    const renderingCount = await this.visChart.getVisualizationRenderingCount();
    const autoApply = await this.find.byCssSelector('#tsvbAutoApplyInput');
    const shouldRender = isChanged && (await this.testSubjects.isEuiSwitchChecked(autoApply));
    await (await option.findByCssSelector('label')).click();
    await this.retry.waitFor(`${selector} to be selected`, async () =>
      (await (await this.testSubjects.find(selector)).findByCssSelector('input')).isSelected()
    );
    if (panelModelKey) {
      await this.waitForPanelModelValue(panelModelKey, Number(value));
      return;
    }
    await this.visChart.waitForVisualizationRenderComplete(renderingCount + Number(shouldRender));
  }

  public async checkTabIsSelected(chartType: string) {
    const chartTypeBtn = await this.testSubjects.find(`${chartType}TsvbTypeBtn`);
    const isSelected = await chartTypeBtn.getAttribute('aria-selected');

    if (isSelected !== 'true') {
      throw new Error(`TSVB ${chartType} tab is not selected`);
    }
  }

  public async checkPanelConfigIsPresent(chartType: string) {
    await this.testSubjects.existOrFail(`tvbPanelConfig__${chartType}`);
  }

  public async checkVisualBuilderIsPresent() {
    await this.checkTabIsLoaded('tvbVisEditor', 'Time Series');
  }

  public async checkTimeSeriesChartIsPresent() {
    const isPresent = await this.find.existsByCssSelector('.tvbVisTimeSeries');
    if (!isPresent) {
      throw new Error(`TimeSeries chart is not loaded`);
    }
  }

  public async checkTimeSeriesIsLight() {
    return await this.find.existsByCssSelector('.tvbVisTimeSeriesLight');
  }

  public async checkTimeSeriesLegendIsPresent() {
    const isPresent = await this.find.existsByCssSelector('.echLegend');
    if (!isPresent) {
      throw new Error(`TimeSeries legend is not loaded`);
    }
  }

  public async checkMetricTabIsPresent() {
    await this.checkTabIsLoaded('tsvbMetricValue', 'Metric');
  }

  public async checkGaugeTabIsPresent() {
    await this.checkTabIsLoaded('tvbVisGaugeContainer', 'Gauge');
  }

  public async checkTopNTabIsPresent() {
    await this.checkTabIsLoaded('tvbVisTopNTable', 'TopN');
  }

  public async clickMetric() {
    const button = await this.testSubjects.find('metricTsvbTypeBtn');
    await button.click();
  }

  public async clickMarkdown() {
    const button = await this.testSubjects.find('markdownTsvbTypeBtn');
    await button.click();
  }

  private async expectText(selector: string, expected: string): Promise<string> {
    return this.retry.try(async () => {
      const actual = await (await this.find.byCssSelector(selector)).getVisibleText();
      expect(actual).to.eql(expected);
      return actual;
    });
  }

  private async expectAttribute(
    getElement: () => Promise<WebElementWrapper>,
    attribute: string,
    expected: string,
    contains = false
  ): Promise<string | null> {
    return this.retry.try(async () => {
      const actual = await (await getElement()).getAttribute(attribute);
      if (contains) {
        expect(actual).to.contain(expected);
      } else {
        expect(actual).to.eql(expected);
      }
      return actual;
    });
  }

  public async expectMetricValue(expected: string): Promise<string> {
    return this.expectText('.tvbVisMetric__value--primary', expected);
  }

  public async expectMarkdownText(expected: string): Promise<string> {
    return this.expectText('.tvbVis', expected);
  }

  public async expectViewTable(expected: string): Promise<string> {
    return this.expectText('[data-test-subj="tableView"]', expected);
  }

  public async expectTopNLabel(expected: string): Promise<string> {
    return this.expectText('.tvbVisTopN__label', expected);
  }

  public async expectTopNCount(expected: string): Promise<string> {
    return this.expectText('.tvbVisTopN__value', expected);
  }

  public async expectBackgroundStyle(expected: string): Promise<string | null> {
    return this.expectAttribute(() => this.find.byClassName('tvbVis'), 'style', expected);
  }

  public async expectMetricValueStyle(expected: string): Promise<string | null> {
    return this.expectAttribute(() => this.testSubjects.find('tsvbMetricValue'), 'style', expected);
  }

  public async expectGaugeValueStyle(expected: string): Promise<string | null> {
    return this.expectAttribute(() => this.testSubjects.find('gaugeValue'), 'style', expected);
  }

  public async expectGaugeColor(expected: string, isInner = false): Promise<string | null> {
    return this.expectAttribute(
      () => this.testSubjects.find(`gaugeCircle${isInner ? 'Inner' : ''}`),
      'stroke',
      expected
    );
  }

  public async expectTopNBarStyle(expected: string, nth = 0): Promise<string | null> {
    return this.expectAttribute(
      async () => (await this.testSubjects.findAll('topNInnerBar'))[nth],
      'style',
      expected,
      true
    );
  }

  public async getMetricValue() {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const metricValue = await this.find.byCssSelector('.tvbVisMetric__value--primary');
    return metricValue.getVisibleText();
  }

  public async enterMarkdown(markdown: string) {
    await this.clearMarkdown();
    await this.monacoEditor.setCodeEditorValueByCssSelector('.tvbMarkdownEditor__editor', markdown);
    await this.waitForPanelModelValue('markdown', markdown);
  }

  private async waitForPanelModelValue(
    key: 'markdown' | 'pivot_label' | 'interval' | 'drop_last_bucket',
    value: string | number
  ): Promise<void> {
    const autoApply = await this.find.byCssSelector('#tsvbAutoApplyInput');
    if (!(await this.testSubjects.isEuiSwitchChecked(autoApply))) return;
    await this.retry.waitFor(`${key} model to be applied`, async () => {
      const url = new URL(await this.browser.getCurrentUrl());
      const query = url.hash.substring(url.hash.indexOf('?') + 1);
      const state = new URLSearchParams(query).get('_a');
      if (!state) return false;
      const appState = decode(state) as {
        vis?: {
          params?: {
            markdown?: string;
            pivot_label?: string;
            interval?: string;
            drop_last_bucket?: number;
          };
        };
      };
      return (appState.vis?.params?.[key] ?? (typeof value === 'number' ? 0 : '')) === value;
    });
  }

  public async clearMarkdown() {
    await this.monacoEditor.clearCodeEditorValueByCssSelector('.tvbMarkdownEditor__editor');
    await this.retry.waitForWithTimeout('text area is cleared', 20000, async () => {
      const linesContainer = await this.find.byCssSelector(
        '.tvbMarkdownEditor__editor .view-lines'
      );
      const lines = await linesContainer.findAllByClassName('mtk1');
      return lines.length === 0;
    });
  }

  public async waitForMarkdownTextAreaCleaned() {
    await this.monacoEditor.clearCodeEditorValueByCssSelector('.tvbMarkdownEditor__editor');
    const text = await this.getMarkdownText();
    return text.length === 0;
  }

  public async getMarkdownText(): Promise<string> {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const el = await this.find.byCssSelector('.tvbVis');
    const text = await el.getVisibleText();
    return text;
  }

  /**
   *
   * getting all markdown variables list which located on `table` section
   *
   * **Note**: if `table` not have variables, use `getMarkdownTableNoVariables` method instead
   * @see {getMarkdownTableNoVariables}
   * @returns {Promise<Array<{key:string, value:string, selector:any}>>}
   * @memberof VisualBuilderPage
   */
  public async getMarkdownTableVariables(): Promise<
    Array<{ key: string; value: string; selector: WebElementWrapper }>
  > {
    const testTableVariables = await this.testSubjects.find('tsvbMarkdownVariablesTable');
    const variablesSelector = 'tbody tr';
    const exists = await this.find.existsByCssSelector(variablesSelector);
    if (!exists) {
      this.log.debug('variable list is empty');
      return [];
    }
    const variables = await testTableVariables.findAllByCssSelector(variablesSelector);

    const variablesKeyValueSelectorMap = await Promise.all(
      variables.map(async (variable) => {
        const subVars = await variable.findAllByCssSelector('td');
        const selector = await subVars[0].findByTagName('a');
        const key = await selector.getVisibleText();
        const value = await subVars[1].getVisibleText();
        this.log.debug(`markdown table variables table is: ${key} ${value}`);
        return { key, value, selector };
      })
    );
    return variablesKeyValueSelectorMap;
  }

  /**
   * return variable table message, if `table` is empty it will be fail
   *
   * **Note:** if `table` have variables, use `getMarkdownTableVariables` method instead
   * @see {@link VisualBuilderPage#getMarkdownTableVariables}
   * @returns
   * @memberof VisualBuilderPage
   */
  public async getMarkdownTableNoVariables() {
    return await this.testSubjects.getVisibleText('tvbMarkdownEditor__noVariables');
  }

  /**
   * get all sub-tabs count for `time series`, `metric`, `top n`, `gauge`, `markdown` or `table` tab.
   *
   * @returns {Promise<any[]>}
   * @memberof VisualBuilderPage
   */
  public async getSubTabs(): Promise<WebElementWrapper[]> {
    return await this.find.allByCssSelector('[data-test-subj$="-subtab"]');
  }

  /**
   * switch markdown sub-tab for visualization
   *
   * @param {'data' | 'options'| 'markdown'} subTab
   * @memberof VisualBuilderPage
   */
  public async markdownSwitchSubTab(subTab: 'data' | 'options' | 'markdown') {
    const tab = await this.testSubjects.find(`${subTab}-subtab`);
    const isSelected = await tab.getAttribute('aria-selected');
    if (isSelected !== 'true') {
      await tab.click();
    }
  }

  /**
   * setting label for markdown visualization
   *
   * @param {string} variableName
   * @param type
   * @memberof VisualBuilderPage
   */
  public async setMarkdownDataVariable(variableName: string, type: 'variable' | 'label') {
    const SELECTOR = type === 'label' ? '[placeholder="Label"]' : '[placeholder="Variable name"]';
    if (variableName) {
      await this.find.setValue(SELECTOR, variableName);
    } else {
      const input = await this.find.byCssSelector(SELECTOR);
      await input.clearValueWithKeyboard({ charByChar: true });
    }
  }

  public async clickSeriesOption(nth = 0) {
    const button = await this.find.byXPath(
      `(//button[@data-test-subj='seriesOptions'])[${nth + 1}]`
    );
    await button.click();
  }

  public async clearOffsetSeries() {
    const el = await this.testSubjects.find('offsetTimeSeries');
    await el.clearValue();
  }

  public async toggleAutoApplyChanges() {
    await this.find.clickByCssSelector('#tsvbAutoApplyInput');
  }

  public async applyChanges() {
    await this.testSubjects.clickWhenNotDisabledWithoutRetry('applyBtn');
  }

  /**
   * change the data formatter for template in an `options` label tab
   *
   * @param formatter - typeof formatter which you can use for presenting data. By default kibana show `Default` formatter
   */
  public async changeDataFormatter(
    formatter: 'default' | 'bytes' | 'number' | 'percent' | 'duration' | 'custom'
  ) {
    const previousLabel = await this.testSubjects.getVisibleText('tsvbDataFormatPicker');
    const renderingCount = await this.visChart.getVisualizationRenderingCount();
    await this.testSubjects.click('tsvbDataFormatPicker');
    await this.testSubjects.click(`tsvbDataFormatPicker-${formatter}`);
    const currentLabel = await this.testSubjects.getVisibleText('tsvbDataFormatPicker');
    await this.visChart.waitForVisualizationRenderComplete(
      renderingCount + Number(currentLabel !== previousLabel)
    );
  }

  public async setDrilldownUrl(value: string) {
    const drilldownEl = await this.testSubjects.find('drilldownUrl');

    await drilldownEl.clearValue();
    await drilldownEl.type(value, { charByChar: true });
    await this.header.waitUntilLoadingHasFinished();
  }

  /**
   * set duration formatter additional settings
   *
   * @param from start format
   * @param to end format
   * @param decimalPlaces decimals count
   */
  public async setDurationFormatterSettings({
    from,
    to,
    decimalPlaces,
  }: {
    from?: FromDuration;
    to?: ToDuration;
    decimalPlaces?: string;
  }) {
    if (from) {
      await this.retry.try(async () => {
        await this.comboBox.set('dataFormatPickerDurationFrom', from);
      });
    }
    if (to) {
      await this.retry.try(async () => {
        await this.comboBox.set('dataFormatPickerDurationTo', to);
      });
    }
    if (decimalPlaces) {
      await this.testSubjects.setValue('dataFormatPickerDurationDecimal', decimalPlaces);
    }
  }

  /**
   * write template for aggregation row in the `option` tab
   *
   * @param template always should contain `{{value}}`
   * @example
   * await visualBuilder.enterSeriesTemplate('$ {{value}}') // add `$` symbol for value
   */
  public async enterSeriesTemplate(template: string) {
    const el = await this.testSubjects.find('tsvb_series_value');
    await el.clearValueWithKeyboard();
    await el.type(template);
  }

  public async enterOffsetSeries(value: string) {
    const el = await this.testSubjects.find('offsetTimeSeries');
    await el.clearValue();
    await el.type(value);
  }

  public async getRhythmChartLegendValue(nth = 0) {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const metricValue = (
      await this.find.allByCssSelector(`.echLegendItem .echLegendItem__legendValue`, 20000)
    )[nth];
    await metricValue.moveMouseTo();
    return await metricValue.getVisibleText();
  }

  public async clickGauge() {
    await this.testSubjects.click('gaugeTsvbTypeBtn');
  }

  public async getGaugeLabel() {
    const gaugeLabel = await this.testSubjects.find('gaugeLabel');
    return await gaugeLabel.getVisibleText();
  }

  public async getGaugeCount() {
    const gaugeCount = await this.testSubjects.find('gaugeValue');
    return await gaugeCount.getVisibleText();
  }

  public async getGaugeColor(isInner = false): Promise<string | null> {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const gaugeColoredCircle = await this.testSubjects.find(`gaugeCircle${isInner ? 'Inner' : ''}`);
    return await gaugeColoredCircle.getAttribute('stroke');
  }

  public async clickTopN() {
    await this.testSubjects.click('top_nTsvbTypeBtn');
  }

  public async getTopNLabel() {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const topNLabel = await this.find.byCssSelector('.tvbVisTopN__label');
    return await topNLabel.getVisibleText();
  }

  public async getTopNCount() {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const gaugeCount = await this.find.byCssSelector('.tvbVisTopN__value');
    return await gaugeCount.getVisibleText();
  }

  public async getTopNBarStyle(nth: number = 0): Promise<string | null> {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const topNBars = await this.testSubjects.findAll('topNInnerBar');
    return await topNBars[nth].getAttribute('style');
  }

  public async clickTable() {
    await this.testSubjects.click('tableTsvbTypeBtn');
  }

  public async createNewAgg(nth = 0) {
    const prevAggs = await this.testSubjects.findAll('aggSelector');
    const elements = await this.testSubjects.findAll('addMetricAddBtn');
    await elements[nth].click();
    await this.retry.waitFor('new agg is added', async () => {
      const currentAggs = await this.testSubjects.findAll('aggSelector');
      return currentAggs.length > prevAggs.length;
    });
  }

  public async createNewAggSeries(nth = 0) {
    const prevAggs = await this.testSubjects.findAll('draggable');
    const elements = await this.testSubjects.findAll('AddAddBtn');
    await elements[nth].click();
    await this.retry.waitFor('new agg series is added', async () => {
      const currentAggs = await this.testSubjects.findAll('draggable');
      return currentAggs.length > prevAggs.length;
    });
  }

  public async createColorRule(nth = 0) {
    const elements = await this.testSubjects.findAll('AddAddBtn');
    await elements[nth].click();
    await this.retry.waitFor('new color rule is added', async () => {
      const currentAddButtons = await this.testSubjects.findAll('AddAddBtn');
      return currentAddButtons.length > elements.length;
    });
  }

  public async selectAggType(value: string, nth = 0) {
    const element = await this.find.byXPath(`(//div[@data-test-subj='aggSelector'])[${nth + 1}]`);
    await this.comboBox.setElement(element, value);
    await this.retry.waitFor(`aggregation ${value} to be selected`, async () =>
      this.comboBox.isOptionSelected(
        await this.find.byXPath(`(//div[@data-test-subj='aggSelector'])[${nth + 1}]`),
        value
      )
    );
  }

  public async fillInExpression(expression: string, nth = 0) {
    const element = await this.find.byXPath(
      `(//textarea[@data-test-subj='mathExpression'])[${nth + 1}]`
    );
    await element.type(expression);
    return await this.header.waitUntilLoadingHasFinished();
  }

  public async fillInVariable(name = 'test', metric = 'Count', nth = 0) {
    const varNameInput = await this.find.byXPath(
      `(//div[@data-test-subj="varRow"])[${nth + 1}]//input[@data-test-subj='tvbAggsVarNameInput']`
    );
    await varNameInput.type(name);
    const metricSelectWrapper = await this.find.byXPath(
      `(//div[@data-test-subj="varRow"])[${
        nth + 1
      }]//div[@data-test-subj='tvbAggsVarMetricWrapper']`
    );

    await this.comboBox.setElement(metricSelectWrapper, metric);
    return await this.header.waitUntilLoadingHasFinished();
  }

  public async selectGroupByField(fieldName: string) {
    await this.comboBox.set('groupByField', fieldName);
  }

  public async setColumnLabelValue(value: string) {
    const el = await this.testSubjects.find('columnLabelName');
    await el.clearValue();
    await el.type(value);
    await this.waitForPanelModelValue('pivot_label', value);
  }

  /**
   * get values for rendered table
   *
   * **Note:** this work only for table visualization
   *
   * @returns {Promise<string>}
   * @memberof VisualBuilderPage
   */
  public async getViewTable(): Promise<string> {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const tableView = await this.testSubjects.find('tableView', 20000);
    return await tableView.getVisibleText();
  }

  private async switchTab(visType: string, tab: string) {
    const testSubj = `${visType}Editor${tab}Btn`;
    await this.testSubjects.click(testSubj);
    await this.retry.try(async () => {
      if (!(await (await this.testSubjects.find(testSubj)).elementHasClass('euiTab-isSelected'))) {
        throw new Error('tab not active');
      }
    });
  }

  public async clickPanelOptions(tabName: string) {
    await this.switchTab(tabName, 'PanelOptions');
  }

  public async clickDataTab(tabName: string) {
    await this.switchTab(tabName, 'Data');
  }

  public async clickAnnotationsTab() {
    await this.switchTab('timeSeries', 'Annotations');
  }

  public async clickAnnotationsAddDataSourceButton() {
    await this.testSubjects.click('addDataSourceButton');
  }

  public async setAnnotationFilter(query: string) {
    await this.testSubjects.setValue('annotationQueryBar', query);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async setAnnotationFields(fields: string) {
    await this.testSubjects.setValue('annotationFieldsInput', fields);
  }

  public async setAnnotationRowTemplate(template: string) {
    await this.testSubjects.setValue('annotationRowTemplateInput', template);
  }

  public async toggleIndexPatternSelectionModePopover(shouldOpen: boolean) {
    await this.retry.try(async () => {
      const isPopoverOpened = await this.testSubjects.exists(
        'switchIndexPatternSelectionModePopoverContent'
      );
      if ((shouldOpen && !isPopoverOpened) || (!shouldOpen && isPopoverOpened)) {
        await this.testSubjects.click('switchIndexPatternSelectionModePopoverButton');
      }
      if (shouldOpen) {
        await this.testSubjects.existOrFail('switchIndexPatternSelectionModePopoverContent');
      } else {
        await this.testSubjects.missingOrFail('switchIndexPatternSelectionModePopoverContent');
      }
    });
  }

  public async switchIndexPatternSelectionMode(useKibanaIndices: boolean) {
    await this.toggleIndexPatternSelectionModePopover(true);
    await this.testSubjects.setEuiSwitch(
      'switchIndexPatternSelectionMode',
      useKibanaIndices ? 'check' : 'uncheck'
    );
    await this.toggleIndexPatternSelectionModePopover(false);
  }

  public async checkIndexPatternSelectionModeSwitchIsEnabled() {
    await this.toggleIndexPatternSelectionModePopover(true);
    let isEnabled;
    await this.testSubjects.retry.tryForTime(2000, async () => {
      isEnabled = await this.testSubjects.isEnabled('switchIndexPatternSelectionMode');
    });
    await this.toggleIndexPatternSelectionModePopover(false);
    return isEnabled;
  }

  public async setIndexPatternValue(value: string, useKibanaIndices?: boolean) {
    const metricsIndexPatternInput = 'metricsIndexPatternInput';

    if (useKibanaIndices !== undefined) {
      await this.retry.try(async () => {
        await this.switchIndexPatternSelectionMode(useKibanaIndices);
      });
    }

    if (useKibanaIndices === false) {
      const el = await this.testSubjects.find(metricsIndexPatternInput);
      await el.focus();
      await el.clearValue();
      if (value) {
        await el.type(value, { charByChar: true });
      }
    } else {
      await this.comboBox.clearInputField(metricsIndexPatternInput);
      if (value) {
        await this.comboBox.setCustom(metricsIndexPatternInput, value);
      }
    }

    await this.header.waitUntilLoadingHasFinished();
  }

  public async setIntervalValue(value: string) {
    const el = await this.testSubjects.find('metricsIndexPatternInterval');
    await el.clearValueWithKeyboard();
    await el.type(value);
    await this.waitForPanelModelValue('interval', value);
  }

  public async setDropLastBucket(value: boolean) {
    await this.toggleYesNoSwitch('metricsDropLastBucket', value, 'drop_last_bucket');
  }

  public async setOverrideIndexPattern(value: boolean) {
    await this.toggleYesNoSwitch('seriesOverrideIndexPattern', value);
  }

  public async waitForIndexPatternTimeFieldOptionsLoaded() {
    await this.retry.waitFor('combobox options loaded', async () => {
      const options = await this.comboBox.getOptions('metricsIndexPatternFieldsSelect');
      this.log.debug(`-- optionsCount=${options.length}`);
      return options.length > 0;
    });
  }

  public async selectIndexPatternTimeField(timeField: string) {
    await this.retry.try(async () => {
      await this.comboBox.clearInputField('metricsIndexPatternFieldsSelect');
      await this.comboBox.set('metricsIndexPatternFieldsSelect', timeField);
    });
  }

  /**
   * check that table visualization is visible and ready for interact
   *
   * @returns {Promise<void>}
   * @memberof VisualBuilderPage
   */
  public async checkTableTabIsPresent(): Promise<void> {
    await this.testSubjects.existOrFail('visualizationLoader');
    const isDataExists = await this.testSubjects.exists('tableView');
    this.log.debug(`data is already rendered: ${isDataExists}`);
    if (!isDataExists) {
      await this.checkPreviewIsDisabled();
    }
  }

  /**
   * set label name for aggregation
   *
   * @param {string} labelName
   * @param {number} [nth=0]
   * @memberof VisualBuilderPage
   */
  public async setLabel(labelName: string, nth: number = 0): Promise<void> {
    const input = (await this.find.allByCssSelector('[placeholder="Label"]'))[nth];
    await input.type(labelName);
  }

  public async setStaticValue(value: number, nth: number = 0): Promise<void> {
    const input = await this.find.byXPath(`(//input[@data-test-subj='staticValue'])[${nth + 1}]`);
    await input.type(value.toString());
  }

  /**
   * set field for type of aggregation
   *
   * @param {string} field name of field
   * @param {number} [aggNth=0] number of aggregation. Start by zero
   * @default 0
   * @memberof VisualBuilderPage
   */
  public async setFieldForAggregation(field: string, aggNth: number = 0): Promise<void> {
    const fieldEl = await this.getFieldForAggregation(aggNth);
    const isAlreadySelected = await this.comboBox.isOptionSelected(fieldEl, field, {
      allowInvalid: true,
    });
    const renderingCount = await this.visChart.getVisualizationRenderingCount();
    const autoApply = await this.find.byCssSelector('#tsvbAutoApplyInput');
    const shouldRender =
      !isAlreadySelected && (await this.testSubjects.isEuiSwitchChecked(autoApply));

    await this.retry.try(async () => {
      await this.comboBox.setElement(await this.getFieldForAggregation(aggNth), field);
      expect(
        await this.comboBox.isOptionSelected(await this.getFieldForAggregation(aggNth), field, {
          allowInvalid: true,
        })
      ).to.be(true);
      expect(
        await this.visChart.isVisualizationRenderComplete(renderingCount + Number(shouldRender))
      ).to.be(true);
    });
  }

  public async setFieldForAggregateBy(field: string): Promise<void> {
    const aggregateBy = await this.testSubjects.find('tsvbAggregateBySelect');

    await this.retry.try(async () => {
      await this.comboBox.setElement(aggregateBy, field);
      if (!(await this.comboBox.isOptionSelected(aggregateBy, field))) {
        throw new Error(`aggregate by field - ${field} is not selected`);
      }
    });
  }

  public async setFunctionForAggregateFunction(func: string): Promise<void> {
    const aggregateFunction = await this.testSubjects.find('tsvbAggregateFunctionCombobox');

    await this.retry.try(async () => {
      await this.comboBox.setElement(aggregateFunction, func);
      if (!(await this.comboBox.isOptionSelected(aggregateFunction, func))) {
        throw new Error(`aggregate function - ${func} is not selected`);
      }
    });
  }

  public async checkFieldForAggregationValidity(aggNth: number = 0): Promise<boolean> {
    const fieldEl = await this.getFieldForAggregation(aggNth);

    return await this.comboBox.checkValidity(fieldEl);
  }

  public async getFieldForAggregation(aggNth: number = 0): Promise<WebElementWrapper> {
    // Aggregation has 2 comboBox elements: Aggregation Type and Field
    // Locator picks the aggregation by index (aggNth) and its Field comboBox child by index (2)
    return await this.find.byXPath(
      `((//div[@data-test-subj='aggRow'])[${aggNth + 1}]//div[@data-test-subj='comboBoxInput'])[2]`
    );
  }

  public async clickColorPicker(nth: number = 0): Promise<void> {
    const picker = await this.find.byXPath(
      `(//button[@data-test-subj='euiColorPickerAnchor'])[${nth + 1}]`
    );
    await picker.clickMouseButton();
  }

  public async setBackgroundColor(colorHex: string): Promise<void> {
    await this.setColorPickerValue(colorHex);
  }

  public async checkColorPickerPopUpIsPresent(): Promise<void> {
    this.log.debug(`Check color picker popup is present`);
    await this.testSubjects.existOrFail('euiColorPickerPopover', { timeout: 5000 });
  }

  public async setColorPickerValue(colorHex: string, nth: number = 0): Promise<void> {
    await this.clickColorPicker(nth);
    await this.checkColorPickerPopUpIsPresent();
    const input = await this.testSubjects.find('euiColorPickerInput_top');
    const previousColor = await input.getAttribute('value');
    const normalizeColor = (color: string) =>
      (color.length === 7 ? `${color}FF` : color).toUpperCase();
    const isChanged = normalizeColor(previousColor ?? '') !== normalizeColor(colorHex);
    const renderingCount = await this.visChart.getVisualizationRenderingCount();
    const autoApply = await this.find.byCssSelector('#tsvbAutoApplyInput');
    const shouldRender = isChanged && (await this.testSubjects.isEuiSwitchChecked(autoApply));
    await this.testSubjects.setValue('euiColorPickerInput_top', colorHex, {
      clearWithKeyboard: true,
      typeCharByChar: true,
    });
    await this.clickColorPicker(nth);
    await this.testSubjects.missingOrFail('euiColorPickerPopover');
    await this.visChart.waitForVisualizationRenderComplete(renderingCount + Number(shouldRender));
  }

  public async setColorRuleOperator(condition: string): Promise<void> {
    await this.retry.try(async () => {
      await this.comboBox.clearLastInputField('colorRuleOperator');
      await this.comboBox.setForLastInput('colorRuleOperator', condition);
    });
  }

  public async setColorRuleValue(value: number, nth: number = 0): Promise<void> {
    await this.retry.try(async () => {
      const colorRuleValueInput = (
        await this.find.allByCssSelector('[data-test-subj="colorRuleValue"]')
      )[nth];
      await colorRuleValueInput.type(value.toString());
    });
  }

  public async getBackgroundStyle(): Promise<string | null> {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const visualization = await this.find.byClassName('tvbVis');
    return await visualization.getAttribute('style');
  }

  public async getMetricValueStyle(): Promise<string | null> {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const metricValue = await this.testSubjects.find('tsvbMetricValue');
    return await metricValue.getAttribute('style');
  }

  public async getGaugeValueStyle(): Promise<string | null> {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const metricValue = await this.testSubjects.find('gaugeValue');
    return await metricValue.getAttribute('style');
  }

  public async changePanelPreview(nth: number = 0): Promise<void> {
    const prevRenderingCount = await this.visChart.getVisualizationRenderingCount();
    const changePreviewBtnArray = await this.testSubjects.findAll('AddActivatePanelBtn');
    await changePreviewBtnArray[nth].click();
    await this.visChart.waitForRenderingCount(prevRenderingCount + 1);
  }

  public async checkPreviewIsDisabled(): Promise<void> {
    this.log.debug(`Check no data message is present`);
    await this.testSubjects.existOrFail('visualization-error', { timeout: 5000 });
  }

  public async cloneSeries(nth: number = 0): Promise<void> {
    const cloneBtnArray = await this.testSubjects.findAll('AddCloneBtn');
    await cloneBtnArray[nth].click();
    await this.retry.waitFor(
      'cloned series to be added',
      async () => (await this.testSubjects.findAll('AddCloneBtn')).length > cloneBtnArray.length
    );
  }

  /**
   * Get aggregation count for the current series
   *
   * @param {number} [nth=0] series
   * @returns {Promise<number>}
   * @memberof VisualBuilderPage
   */
  public async getAggregationCount(nth: number = 0): Promise<number> {
    const series = await this.getSeries();
    const aggregation = await series[nth].findAllByTestSubject('draggable');
    return aggregation.length;
  }

  public async deleteSeries(nth: number = 0): Promise<void> {
    const prevRenderingCount = await this.visChart.getVisualizationRenderingCount();
    const cloneBtnArray = await this.testSubjects.findAll('AddDeleteBtn');
    await cloneBtnArray[nth].click();
    await this.visChart.waitForRenderingCount(prevRenderingCount + 1);
  }

  public async getLegendItems(): Promise<WebElementWrapper[]> {
    return await this.find.allByCssSelector('.echLegendItem');
  }

  public async getLegendItemsContent(): Promise<string[]> {
    const legendList = await this.find.byCssSelector('.echLegendGridList');
    const $ = await legendList.parseDomContent();

    return $('li')
      .toArray()
      .map((li) => {
        const label = $(li).find('.echLegendItem__label').text();
        const value = $(li).find('.echLegendItem__legendValue').text();

        return `${label}: ${value}`;
      });
  }

  public async getSeries(): Promise<WebElementWrapper[]> {
    return await this.find.allByCssSelector('.tvbSeriesEditor');
  }

  public async setMetricsGroupBy(option: string) {
    const groupBy = await this.testSubjects.find('groupBySelect');
    await this.comboBox.setElement(groupBy, option);
    await this.retry.waitFor(`group-by ${option} to be selected`, async () =>
      this.comboBox.isOptionSelected(await this.testSubjects.find('groupBySelect'), option)
    );
  }

  public async setMetricsGroupByTerms(
    field: string,
    filtering: { include?: string; exclude?: string } = {}
  ) {
    await this.setMetricsGroupBy('terms');
    await this.retry.try(async () => {
      const byField = await this.testSubjects.find('groupByField');
      await this.comboBox.setElement(byField, field);
      const isSelected = await this.comboBox.isOptionSelected(byField, field);
      if (!isSelected) {
        throw new Error(`setMetricsGroupByTerms: failed to set '${field}' field`);
      }
    });
    await this.setMetricsGroupByFiltering(filtering.include, filtering.exclude);
  }

  public async setAnotherGroupByTermsField(field: string) {
    const previousFieldCount = (await this.testSubjects.findAll('fieldSelectItem')).length;
    // Using xpath locator to find the last element
    const fieldSelectAddButtonLast = await this.find.byXPath(
      `(//*[@data-test-subj='fieldSelectItemAddBtn'])[last()]`
    );
    // In case of StaleElementReferenceError 'browser' service will try to find element again
    await fieldSelectAddButtonLast.click();
    await this.retry.waitFor(
      'another group-by field to be added',
      async () => (await this.testSubjects.findAll('fieldSelectItem')).length > previousFieldCount
    );

    await this.retry.try(async () => {
      const selectedByField = await this.find.byXPath(
        `(//*[@data-test-subj='fieldSelectItem'])[last()]`
      );
      await this.comboBox.setElement(selectedByField, field);
      const isSelected = await this.comboBox.isOptionSelected(selectedByField, field);
      if (!isSelected) {
        throw new Error(`setAnotherGroupByTermsField: failed to set '${field}' field`);
      }
    });
  }

  public async setMetricsGroupByFiltering(include?: string, exclude?: string) {
    const setFilterValue = async (value: string | undefined, subjectKey: string) => {
      if (typeof value === 'string') {
        const valueSubject = await this.testSubjects.find(subjectKey);

        await valueSubject.clearValue();
        await valueSubject.type(value);
      }
    };

    await setFilterValue(include, 'groupByInclude');
    await setFilterValue(exclude, 'groupByExclude');
  }

  public async checkSelectedMetricsGroupByValue(value: string) {
    const groupBy = await this.testSubjects.find('groupBySelect');
    return await this.comboBox.isOptionSelected(groupBy, value);
  }

  public async addGroupByFilterRow() {
    const addButton = await this.testSubjects.find('filterRowAddBtn');
    await addButton.click();
  }

  public async setGroupByFilterQuery(query: string, nth: number = 0) {
    const filterQueryInput = await this.find.byXPath(
      `(//textarea[@data-test-subj='filterItemsQueryBar'])[${nth + 1}]`
    );
    await filterQueryInput.type(query);
  }

  public async setGroupByFilterLabel(label: string, nth: number = 0) {
    const filterLabelInput = await this.find.byXPath(
      `(//input[@data-test-subj='filterItemsLabel'])[${nth + 1}]`
    );
    await filterLabelInput.type(label);
  }

  public async setChartType(type: 'Bar' | 'Line', nth: number = 0) {
    const seriesChartTypeComboBox = await this.find.byXPath(
      `(//div[@data-test-subj='seriesChartTypeComboBox'])[${nth + 1}]`
    );
    return await this.comboBox.setElement(seriesChartTypeComboBox, type);
  }

  public async setStackedType(stackedType: string, nth: number = 0) {
    const seriesStackedComboBox = await this.find.byXPath(
      `(//div[@data-test-subj='seriesStackedComboBox'])[${nth + 1}]`
    );
    return await this.comboBox.setElement(seriesStackedComboBox, stackedType);
  }

  public async setSeriesFilter(query: string) {
    await this.testSubjects.setValue('seriesConfigQueryBar', query);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async setPanelFilter(query: string) {
    await this.testSubjects.setValue('panelFilterQueryBar', query);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async setIgnoreFilters(value: boolean) {
    await this.toggleYesNoSwitch('ignore_global_filter', value);
  }

  public async setMetricsDataTimerangeMode(value: string) {
    const dataTimeRangeMode = await this.testSubjects.find('dataTimeRangeMode');
    return await this.comboBox.setElement(dataTimeRangeMode, value);
  }

  public async checkSelectedDataTimerangeMode(value: string) {
    const dataTimeRangeMode = await this.testSubjects.find('dataTimeRangeMode');
    return await this.comboBox.isOptionSelected(dataTimeRangeMode, value);
  }

  public async setTopHitAggregateWithOption(option: string): Promise<void> {
    await this.comboBox.set('topHitAggregateWithComboBox', option);
  }

  public async setTopHitOrderByField(timeField: string) {
    await this.retry.try(async () => {
      await this.comboBox.clearInputField('topHitOrderByFieldSelect');
      await this.comboBox.set('topHitOrderByFieldSelect', timeField);
    });
  }

  public async setFilterRatioOption(optionType: 'Numerator' | 'Denominator', query: string) {
    await this.testSubjects.setValue(`filterRatio${optionType}Input`, query);
  }

  public async clickSeriesLegendItem(name: string) {
    await this.find.clickByCssSelector(`[data-ech-series-name="${name}"] .echLegendItem__label`);
  }

  public async toggleNewChartsLibraryWithDebug(enabled: boolean) {
    await this.elasticChart.setNewChartUiDebugFlag(enabled);
  }

  public async getChartDebugState(chartData?: DebugState) {
    if (chartData) return chartData;
    await this.visChart.waitForVisualizationRenderComplete();
    return (await this.elasticChart.getChartDebugData())!;
  }

  public async getXAxisTitle(chartData?: DebugState, nth: number = 0) {
    const debugState = await this.getChartDebugState(chartData);
    return debugState?.axes?.x[nth]?.title;
  }

  public async getLegendNames(chartData?: DebugState) {
    const legendItems = (await this.getChartDebugState(chartData))?.legend?.items ?? [];
    return legendItems.map(({ name }) => name);
  }

  public async getChartItems(
    chartData?: DebugState,
    itemType: 'areas' | 'bars' | 'annotations' = 'areas'
  ) {
    return (await this.getChartDebugState(chartData))?.[itemType];
  }

  public async getAreaChartColors(chartData?: DebugState) {
    const areas = (await this.getChartItems(chartData)) as DebugState['areas'];
    return areas?.map(({ color }) => color);
  }

  public async getAreaChartData(chartData?: DebugState, nth: number = 0) {
    const areas = (await this.getChartItems(chartData)) as DebugState['areas'];
    return areas?.[nth]?.lines.y1.points.sort((a, b) => a.x - b.x).map(({ x, y }) => [x, y]);
  }

  public async getAnnotationsData(chartData?: DebugState) {
    const annotations = (await this.getChartItems(
      chartData,
      'annotations'
    )) as DebugState['annotations'];
    return annotations?.map(({ data }) => data);
  }

  public async getVisualizeError() {
    const visError = await this.testSubjects.find(`visualization-error`);
    const errorSpans = await visError.findAllByTestSubject('visualization-error-text');
    return await errorSpans[0].getVisibleText();
  }

  public async checkInvalidAggComponentIsPresent() {
    await this.testSubjects.existOrFail(`invalid_agg`);
  }
}
