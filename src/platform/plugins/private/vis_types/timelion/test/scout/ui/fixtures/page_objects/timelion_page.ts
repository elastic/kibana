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
const TIMELION_CHART_STATUS_SELECTOR = `[data-test-subj="${TIMELION_CHART_SELECTOR}"] .echChartStatus`;

declare global {
  interface Window {
    _echDebugStateFlag?: boolean;
  }
}

export class TimelionPage {
  private readonly intervalComboBox: EuiComboBoxWrapper;
  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.intervalComboBox = new EuiComboBoxWrapper(this.page, 'timelionIntervalComboBox');
    this.codeEditor = new KibanaCodeEditorWrapper(this.page);
  }

  async goto() {
    // Enable chart debug state before app navigation so first chart render includes debug metadata.
    await this.page.addInitScript(() => {
      window._echDebugStateFlag = true;
    });

    await this.page.gotoApp('visualize');
    const newButton = this.page.testSubj.locator('newItemButton');
    await newButton.click();

    const legacyTab = this.page.testSubj.locator('groupModalLegacyTab');
    await legacyTab.click();

    const aggBased = this.page.testSubj.locator('visType-aggbased');
    await aggBased.click();

    await this.page.testSubj.locator('visNewDialogTypes').waitFor();
    const timelionType = this.page.testSubj.locator('visType-timelion');
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
      window._echDebugStateFlag = true;
    });

    // Get current render count before clicking "Go"
    const chartStatus = this.page.testSubj
      .locator(TIMELION_CHART_SELECTOR)
      .locator('.echChartStatus');
    await chartStatus.waitFor({ state: 'attached' });
    const prevCount = Number(await chartStatus.getAttribute('data-ech-render-count')) || 0;

    // Click Go button
    await this.page.testSubj.locator('visualizeEditorRenderButton').click();

    // Wait for rendering count to increase and render completion for the new request.
    await this.page.waitForFunction(
      ({ minCount, selector }) => {
        const status = document.querySelector(selector);
        if (!status) {
          return false;
        }

        const count = Number(status.getAttribute('data-ech-render-count') || 0);
        const isRenderComplete = status.getAttribute('data-ech-render-complete') === 'true';
        return count >= minCount && isRenderComplete;
      },
      { minCount: prevCount + 1, selector: TIMELION_CHART_STATUS_SELECTOR },
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

    await this.page.waitForFunction(
      (selector) => {
        const status = document.querySelector(selector);
        if (!status) {
          return false;
        }

        const debugState = status.getAttribute('data-ech-debug-state');
        if (!debugState) {
          return false;
        }

        try {
          JSON.parse(debugState);
          return true;
        } catch {
          return false;
        }
      },
      TIMELION_CHART_STATUS_SELECTOR,
      { timeout: 30000 }
    );

    const debugDataString = await chartStatus.getAttribute('data-ech-debug-state');
    if (!debugDataString) {
      throw new Error('Elastic charts debugState not found');
    }

    try {
      return JSON.parse(debugDataString);
    } catch {
      throw new Error('Unable to parse Elastic charts debugState');
    }
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
    const rows = await suggestWidget.locator('.monaco-list-row').all();
    return await Promise.all(rows.map(async (row) => await row.innerText()));
  }

  async clickSuggestion(index = 0) {
    const suggestWidget = this.codeEditor.getCodeEditorSuggestWidget();
    const rows = await suggestWidget.locator('.monaco-list-row').all();
    const row = rows[index];

    if (!row) {
      throw new Error(`Unable to click suggestion at index ${index}; only ${rows.length} found.`);
    }

    await row.click();
  }
}
