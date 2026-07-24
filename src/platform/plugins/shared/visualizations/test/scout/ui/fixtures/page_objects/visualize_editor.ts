/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

interface IntervalOptions {
  type?: 'default' | 'numeric' | 'custom';
  aggNth?: number;
  append?: boolean;
}

/**
 * Page object for the aggregation-based Visualize editor sidebar (data/metrics/buckets
 * configuration, apply/reset, interval handling). Ported from the FTR `visEditor`
 * page object, using Playwright auto-waiting and `data-test-subj` selectors.
 */
export class VisualizeEditor {
  private readonly renderButton: Locator;
  private readonly resetButton: Locator;
  private readonly visualizationLoader: Locator;

  constructor(private readonly page: ScoutPage) {
    this.renderButton = this.page.testSubj.locator('visualizeEditorRenderButton');
    this.resetButton = this.page.testSubj.locator('visualizeEditorResetButton');
    this.visualizationLoader = this.page.testSubj.locator('visualizationLoader');
  }

  async clickDataTab() {
    await this.page.testSubj.click('visEditorTab__data');
  }

  async clickOptionsTab() {
    await this.page.testSubj.click('visEditorTab__options');
  }

  /**
   * Adds a new bucket (e.g. 'Split rows', 'Split table') to the given group.
   * @param bucketName bucket name, like 'Split rows', 'Split table', 'Metric'
   * @param type aggregation group, like 'buckets', 'metrics'
   */
  async clickBucket(bucketName: string, type = 'buckets') {
    const addOption = this.page.testSubj.locator(`visEditorAdd_${type}_${bucketName}`);
    if (!(await addOption.isVisible())) {
      await this.page.testSubj.click(`visEditorAdd_${type}`);
    }
    await this.page.testSubj.click(`visEditorAdd_${type}_${bucketName}`);
  }

  /**
   * CSS selector for the currently-open aggregation accordions of a group. Several
   * can match at once: a pipeline aggregation (e.g. Average Bucket) opens nested
   * sub-agg accordions that also carry `.euiAccordion-isOpen`. Callers below append
   * a combo selector and pin to the first match (mirroring the FTR page object,
   * which selected index 0 of the equivalent query).
   */
  private openAccordionSelector(groupName: string): string {
    return `[data-test-subj="${groupName}AggGroup"] [data-test-subj^="visEditorAggAccordion"].euiAccordion-isOpen`;
  }

  /**
   * Type-to-filter then select an option in an aggregation combo box. Operates on a
   * single pre-resolved combo `root` (never a multi-match locator) so re-evaluated
   * steps such as `blur()` stay strict-mode safe even after selecting a value spawns
   * additional combos (sub-aggregations) inside the same open accordion.
   */
  private async selectComboOption(root: Locator, testSubj: string, value: string) {
    const inputWrapper = root.getByTestId('comboBoxInput');
    const searchField = root.getByTestId('comboBoxSearchInput');

    await inputWrapper.click();
    await searchField.fill(value);

    // Match the option by its exact text content rather than its accessible name:
    // EUI wraps the filtered substring in `<mark>` and injects screen-reader help text
    // via CSS, which the accessible name includes — so an exact name match for e.g.
    // "Terms" fails and a substring match also hits "Rare terms"/"Significant Terms".
    // `hasText` reads text content (ignoring CSS-generated content), and an anchored
    // regex pins it to the exact label.
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const optionsList = this.page.locator(`[data-test-subj~="${testSubj}-optionsList"]`);
    const exactOption = optionsList
      .getByRole('option')
      .filter({ hasText: new RegExp(`^${escaped}$`) });

    await exactOption.click();
    await searchField.blur();
  }

  async selectAggregation(aggValue: string, groupName = 'buckets', isChildAggregation = false) {
    // The parent agg-select renders before its sub-agg selects, so `nth=0` targets the
    // parent; when `isChildAggregation`, scoping to `.visEditorAgg__subAgg` first and
    // then `nth=0` targets the first (bucket) sub-agg — matching the FTR behavior.
    const sub = isChildAggregation ? ' .visEditorAgg__subAgg' : '';
    const root = this.page.locator(
      `${this.openAccordionSelector(
        groupName
      )}${sub} [data-test-subj="defaultEditorAggSelect"] >> nth=0`
    );
    await this.selectComboOption(root, 'defaultEditorAggSelect', aggValue);
  }

  async selectField(fieldValue: string, groupName = 'buckets', isChildAggregation = false) {
    const sub = isChildAggregation ? ' .visEditorAgg__subAgg' : '';
    const root = this.page.locator(
      `${this.openAccordionSelector(
        groupName
      )} [data-test-subj="visAggEditorParams"]${sub} [data-test-subj="visDefaultEditorField"] >> nth=0`
    );
    await this.selectComboOption(root, 'visDefaultEditorField', fieldValue);
  }

  async setInterval(newValue: string | number, options: IntervalOptions = {}) {
    const newValueString = `${newValue}`;
    const { type = 'default', aggNth = 2, append = false } = options;

    if (type === 'default') {
      await this.page.components.comboBox('visEditorInterval').setSelectedOptions([newValueString]);
      return;
    }
    if (type === 'custom') {
      await this.page.components
        .comboBox('visEditorInterval')
        .setCustomSelectedOptions([newValueString]);
      return;
    }

    // numeric
    const autoMode = await this.page.testSubj.getAttribute(
      `visEditorIntervalSwitch${aggNth}`,
      'aria-checked'
    );
    if (autoMode === 'true') {
      await this.page.testSubj.click(`visEditorIntervalSwitch${aggNth}`);
    }
    const input = this.page.testSubj.locator(`visEditorInterval${aggNth}`);
    if (append) {
      await input.click();
      await input.press('End');
      await input.pressSequentially(newValueString);
    } else {
      await input.fill(newValueString);
    }
  }

  async getNumericInterval(aggNth = 2): Promise<string> {
    return this.page.testSubj.locator(`visEditorInterval${aggNth}`).inputValue();
  }

  async isApplyEnabled(): Promise<boolean> {
    return this.renderButton.isEnabled();
  }

  /**
   * Applies pending editor changes and waits for the visualization to re-render.
   * A poll on the loader's rendering count is required because the count advances
   * asynchronously once the render pipeline completes.
   */
  async clickGo() {
    const prevRenderingCount = Number(
      (await this.visualizationLoader.getAttribute('data-rendering-count')) ?? '0'
    );
    await this.renderButton.click();
    await expect
      .poll(async () =>
        Number((await this.visualizationLoader.getAttribute('data-rendering-count')) ?? '0')
      )
      .toBeGreaterThan(prevRenderingCount);
    await this.waitForRenderComplete();
  }

  async clickReset() {
    await this.resetButton.click();
    await this.waitForRenderComplete();
  }

  private async waitForRenderComplete() {
    await this.page
      .locator('[data-test-subj="visualizationLoader"][data-render-complete="true"]')
      .waitFor({ state: 'visible' });
  }

  async isSwitchChecked(selector: string): Promise<boolean> {
    return (await this.page.testSubj.getAttribute(selector, 'aria-checked')) === 'true';
  }

  async checkSwitch(selector: string) {
    if (!(await this.isSwitchChecked(selector))) {
      await this.page.testSubj.click(selector);
    }
  }

  async uncheckSwitch(selector: string) {
    if (await this.isSwitchChecked(selector)) {
      await this.page.testSubj.click(selector);
    }
  }

  async setSelectByOptionText(selectId: string, optionText: string) {
    await this.page.locator(`#${selectId}`).selectOption({ label: optionText });
  }

  async removeDimension(aggNth: number) {
    await this.page.testSubj.click(`visEditorAggAccordion${aggNth} > removeDimensionBtn`);
  }

  async clickMetricEditor() {
    await this.page.locator('[data-test-subj="metricsAggGroup"] .euiAccordion__button').click();
  }

  async setSize(newValue: number, aggId?: number) {
    const dataTestSubj = aggId
      ? `visEditorAggAccordion${aggId} > sizeParamEditor`
      : 'sizeParamEditor';
    await this.page.testSubj.fill(dataTestSubj, String(newValue));
  }

  async toggleAccordion(id: string, toState = 'true') {
    // An open EUI accordion exposes two elements with the same `aria-controls`: the
    // decorative arrow icon (`aria-hidden`) and the real labelled toggle button.
    // Target the interactive one to stay strict-mode safe.
    const toggle = this.page.locator(`button[aria-controls="${id}"]:not([aria-hidden="true"])`);
    const toggleOpen = await toggle.getAttribute('aria-expanded');
    if (toggleOpen !== toState) {
      await toggle.click();
    }
  }

  async toggleOpenEditor(index: number, toState = 'true') {
    await this.toggleAccordion(`visEditorAggAccordion${index}`, toState);
  }

  async toggleOtherBucket(agg: string | number = 2) {
    await this.page.testSubj.click(`visEditorAggAccordion${agg} > otherBucketSwitch`);
  }

  async toggleMissingBucket(agg: string | number = 2) {
    await this.page.testSubj.click(`visEditorAggAccordion${agg} > missingBucketSwitch`);
  }

  async clickSplitDirection(direction: string) {
    await this.page.testSubj.click(`visEditorSplitBy-${direction}`);
  }
}
