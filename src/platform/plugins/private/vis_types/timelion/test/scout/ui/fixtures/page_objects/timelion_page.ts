/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { EuiComboBoxWrapper, KibanaCodeEditorWrapper } from '@kbn/scout';

const TIMELION_CHART_SELECTOR = 'timelionChart';

export class TimelionPage {
  private readonly intervalComboBox: EuiComboBoxWrapper;
  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.intervalComboBox = new EuiComboBoxWrapper(this.page, 'timelionIntervalComboBox');
    this.codeEditor = new KibanaCodeEditorWrapper(this.page);
  }

  async goto() {
    await this.page.gotoApp('visualize');
    const newButton = this.page.testSubj.locator('newItemButton');
    await newButton.waitFor();
    await newButton.click();

    const legacyTab = this.page.testSubj.locator('groupModalLegacyTab');
    await legacyTab.waitFor();
    await legacyTab.click();

    const aggBased = this.page.testSubj.locator('visType-aggbased');
    await aggBased.waitFor();
    await aggBased.click();

    await this.page.testSubj.locator('visNewDialogTypes').waitFor();
    const timelionType = this.page.testSubj.locator('visType-timelion');
    await timelionType.waitFor();
    await timelionType.click();

    await this.page.testSubj.locator(TIMELION_CHART_SELECTOR).waitFor();
  }

  async setInterval(interval: string) {
    await this.intervalComboBox.setCustomSingleOption(interval);
  }

  async setExpression(expression: string) {
    await this.codeEditor.setCodeEditorValue(expression);
  }

  async getCodeEditorValue(nthIndex = 0): Promise<string> {
    return await this.codeEditor.getCodeEditorValue(nthIndex);
  }

  async clickGo() {
    // Enable debug state for elastic charts
    await this.page.evaluate(() => {
      (window as any)._echDebugStateFlag = true;
    });

    // Get current render count (0 if chart hasn't rendered yet)
    const chartStatus = this.page.testSubj
      .locator(TIMELION_CHART_SELECTOR)
      .locator('.echChartStatus');

    let prevCount = 0;
    try {
      if (await chartStatus.isVisible()) {
        prevCount = Number(await chartStatus.getAttribute('data-ech-render-count')) || 0;
      }
    } catch {
      // Chart hasn't rendered yet
    }

    // Click Go button
    await this.page.testSubj.locator('visualizeEditorRenderButton').click();

    // Wait for rendering count to increase
    await this.page.waitForFunction(
      (minCount) => {
        const el = document.querySelector('[data-test-subj="timelionChart"] .echChartStatus');
        if (!el) return false;
        const count = Number(el.getAttribute('data-ech-render-count') || 0);
        return count >= minCount;
      },
      prevCount + 1,
      { timeout: 30000 }
    );
  }

  async initVisualization(expression: string, interval: string = '12h') {
    await this.setInterval(interval);
    await this.setExpression(expression);
    await this.clickGo();
  }

  private async getChartDebugData(): Promise<any> {
    const chartStatus = this.page.testSubj
      .locator(TIMELION_CHART_SELECTOR)
      .locator('.echChartStatus');
    const debugDataString = await chartStatus.getAttribute('data-ech-debug-state');
    if (!debugDataString) {
      throw new Error('Elastic charts debugState not found');
    }
    return JSON.parse(debugDataString);
  }

  async getAreaChartData(
    dataLabel: string,
    shouldContainXAxisData = false
  ): Promise<number[] | number[][]> {
    const debugData = await this.getChartDebugData();
    const areas = debugData?.areas ?? [];
    const points = areas.find((a: any) => a.name === dataLabel)?.lines?.y1?.points ?? [];
    const sorted = [...points].sort((a: any, b: any) => a.x - b.x);
    return shouldContainXAxisData
      ? sorted.map(({ x, y }: any) => [x, y])
      : sorted.map(({ y }: any) => y);
  }

  async getAreaColors(): Promise<string[]> {
    const debugData = await this.getChartDebugData();
    const areas = debugData?.areas ?? [];
    return areas.map(({ color }: any) => color);
  }

  async getAxesCountByPosition(position: string): Promise<number> {
    const debugData = await this.getChartDebugData();
    const yAxes = debugData?.axes?.y ?? [];
    return yAxes.filter((axis: any) => axis.position === position).length;
  }

  async getYAxisLabels(nth = 0): Promise<string[]> {
    const debugData = await this.getChartDebugData();
    const yAxes = debugData?.axes?.y ?? [];
    return yAxes[nth]?.labels ?? [];
  }

  async getLegendEntries(): Promise<string[]> {
    const debugData = await this.getChartDebugData();
    const items = debugData?.legend?.items ?? [];
    return items.map(({ name }: any) => name);
  }

  async getAreaSeriesCount(): Promise<number> {
    const debugData = await this.getChartDebugData();
    const areas = debugData?.areas ?? [];
    return areas.filter((area: any) => area.lines.y1.visible).length;
  }

  async getHistogramSeriesCount(): Promise<number> {
    const debugData = await this.getChartDebugData();
    const bars = debugData?.bars ?? [];
    return bars.filter(({ visible }: any) => visible).length;
  }

  async isLegendVisible(): Promise<boolean> {
    return await this.page
      .locator('.echLegend')
      .isVisible()
      .catch(() => false);
  }

  async getLegendClasses(): Promise<string> {
    return (await this.page.locator('.echLegend').getAttribute('class')) ?? '';
  }

  // Expression typeahead helpers

  async typeInCodeEditor(value: string) {
    const textarea = this.page.testSubj.locator('timelionCodeEditor').locator('textarea');
    await textarea.pressSequentially(value, { delay: 50 });
  }

  async getSuggestionItems(): Promise<string[]> {
    const suggestWidget = this.codeEditor.getCodeEditorSuggestWidget();
    await suggestWidget.waitFor({ state: 'visible' });
    const rows = suggestWidget.locator('.monaco-list-row');
    const count = await rows.count();
    const items: string[] = [];
    for (let i = 0; i < count; i++) {
      items.push(await rows.nth(i).innerText());
    }
    return items;
  }

  async clickSuggestion(index = 0) {
    const suggestWidget = this.codeEditor.getCodeEditorSuggestWidget();
    const rows = suggestWidget.locator('.monaco-list-row');
    await rows.nth(index).click();
  }
}
