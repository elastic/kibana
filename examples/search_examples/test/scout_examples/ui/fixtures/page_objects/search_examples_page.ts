/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxObject, Locator, PageObjects, ScoutPage } from '@kbn/scout';
import {
  APP_ID,
  DATA_VIEW,
  LOGSTASH_TIME_RANGE,
  SAMPLE_01_DATA_VIEW_NAME,
  SAMPLE_01_TIME_RANGE,
} from '../constants';

/**
 * Page object for the search_examples demo apps.
 */
export class SearchExamplesPage {
  readonly searchSourceWithOther: Locator;
  readonly searchSourceWithoutOther: Locator;
  readonly searchWithWarning: Locator;
  readonly responseTab: Locator;
  readonly responseCodeBlock: Locator;
  readonly requestCodeBlock: Locator;
  readonly requestFibonacci: Locator;
  readonly progressBar: Locator;
  readonly startSearch: Locator;
  readonly restoreSearch: Locator;
  readonly saveBackgroundSearchButton: Locator;
  readonly sqlQueryInput: Locator;
  readonly querySubmitButton: Locator;
  readonly warningsTab: Locator;
  readonly warningsCodeBlock: Locator;
  readonly viewWarningBtn: Locator;
  readonly dataViewSelector: EuiComboBoxObject;
  readonly searchBucketField: EuiComboBoxObject;
  readonly searchMetricField: EuiComboBoxObject;

  constructor(
    private readonly page: ScoutPage,
    private readonly datePicker: PageObjects['datePicker']
  ) {
    this.searchSourceWithOther = this.page.testSubj.locator('searchSourceWithOther');
    this.searchSourceWithoutOther = this.page.testSubj.locator('searchSourceWithoutOther');
    this.searchWithWarning = this.page.testSubj.locator('searchWithWarning');
    this.responseTab = this.page.testSubj.locator('responseTab');
    this.responseCodeBlock = this.page.testSubj.locator('responseCodeBlock');
    this.requestCodeBlock = this.page.testSubj.locator('requestCodeBlock');
    this.requestFibonacci = this.page.testSubj.locator('requestFibonacci');
    this.progressBar = this.page.testSubj.locator('progressBar');
    this.startSearch = this.page.testSubj.locator('startSearch');
    this.restoreSearch = this.page.testSubj.locator('restoreSearch');
    this.saveBackgroundSearchButton = this.page.testSubj.locator(
      'queryCancelButton-secondary-button'
    );
    this.sqlQueryInput = this.page.testSubj.locator('sqlQueryInput');
    this.querySubmitButton = this.page.testSubj.locator('querySubmitButton');
    this.warningsTab = this.page.testSubj.locator('warningsTab');
    this.warningsCodeBlock = this.page.testSubj.locator('warningsCodeBlock');
    this.viewWarningBtn = this.page.testSubj.locator('viewWarningBtn');
    this.dataViewSelector = this.page.components.comboBox('dataViewSelector');
    this.searchBucketField = this.page.components.comboBox('searchBucketField');
    this.searchMetricField = this.page.components.comboBox('searchMetricField');
  }

  searchResults(count: number): Locator {
    return this.page.testSubj.locator(`searchResults-${count}`);
  }

  async gotoSearch(): Promise<void> {
    await this.page.gotoApp(`${APP_ID}/search`);
    await this.page.testSubj.locator('dataViewSelector').waitFor({ state: 'visible' });
  }

  async gotoSearchSessions(): Promise<void> {
    await this.page.gotoApp(`${APP_ID}/search-sessions`);
    await this.page.testSubj.locator('dataViewSelector').waitFor({ state: 'visible' });
  }

  async gotoSqlSearch(): Promise<void> {
    await this.page.gotoApp(`${APP_ID}/sql-search`);
    await this.sqlQueryInput.waitFor({ state: 'visible' });
  }

  /**
   * Configures the Search demo: data view, bucket/metric fields, and time range.
   */
  async configureSearchDemo(): Promise<void> {
    await this.dataViewSelector.setSelectedOptions([DATA_VIEW]);
    // Field options load after the data view resolves.
    await this.page.testSubj.locator('searchBucketField').waitFor({ state: 'visible' });
    await this.replaceSingleComboSelection('searchBucketField', 'geo.src');
    await this.replaceSingleComboSelection('searchMetricField', 'memory');
    await this.datePicker.setAbsoluteRange(LOGSTASH_TIME_RANGE);
  }

  /**
   * Configures the Search demo for shard-failure warnings: downsampled
   * data view, rollup metric field, and the range covering sample-01.
   */
  async configureWarningsDemo(dataViewName: string = SAMPLE_01_DATA_VIEW_NAME): Promise<void> {
    await this.dataViewSelector.setSelectedOptions([dataViewName]);
    await this.page.testSubj.locator('searchMetricField').waitFor({ state: 'visible' });
    await this.replaceSingleComboSelection(
      'searchMetricField',
      'kubernetes.container.memory.usage.bytes'
    );
    await this.datePicker.setAbsoluteRange(SAMPLE_01_TIME_RANGE);
  }

  /**
   * Configures the Search Sessions demo: data view, metric, and time range.
   * Finishes after startSearch is actionable so date-picker query resets
   * cannot clear the session after the spec starts it.
   */
  async configureSearchSessionDemo(): Promise<void> {
    await this.dataViewSelector.setSelectedOptions([DATA_VIEW]);
    await this.replaceSingleComboSelection('searchMetricField', 'bytes');
    await this.datePicker.setAbsoluteRange(LOGSTASH_TIME_RANGE);
    await this.page.testSubj
      .locator('dateRangePickerCustomRangePanel')
      .waitFor({ state: 'hidden' });
    await this.startSearch.click({ trial: true });
  }

  /**
   * Picks `label` on a single-select combo. `setSelectedOptions` tries to
   * clear existing pills first; these demo combos render pills without a
   * close button, so that helper hangs. Typing the full label focuses the
   * exact option (`geo.src` ahead of `geo.srcdest`); Enter commits it.
   */
  private async replaceSingleComboSelection(testSubj: string, label: string): Promise<void> {
    const combo = this.page.components.comboBox(testSubj);
    if ((await combo.getSelectedOptions()).includes(label)) {
      return;
    }

    const root = this.page.testSubj.locator(testSubj);
    const searchInput = root.getByTestId('comboBoxSearchInput');
    await root.getByTestId('comboBoxInput').click();
    await searchInput.fill(label);
    await this.page.getByRole('listbox').waitFor({ state: 'visible' });
    await searchInput.press('Enter');
  }

  /**
   * Saves via the query-bar split button while the search is in-flight.
   * The secondary control is disabled for 500ms after Loading and unmounts
   * when the search completes.
   */
  async saveBackgroundSearch(): Promise<void> {
    await this.page.testSubj.locator('queryCancelButton').waitFor({ state: 'visible' });
    await this.saveBackgroundSearchButton.click();
  }
}
