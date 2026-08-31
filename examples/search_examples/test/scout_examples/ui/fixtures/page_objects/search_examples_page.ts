/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, PageObjects, ScoutPage } from '@kbn/scout';
import { APP_ID, DATA_VIEW, LOGSTASH_TIME_RANGE } from '../constants';

/**
 * Page object for the search_examples demo apps.
 *
 * Combo selection uses a temporary replace-without-clear path: shared
 * `setSelectedOptions` clears pills via × first and times out on these
 * `singleSelection` demos. Keep until Apps DX adds that behavior to
 * `@elastic/eui-test-helpers`.
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
    await this.selectSingleComboOption('dataViewSelector', DATA_VIEW);
    // Field options load after the data view resolves.
    await this.page.testSubj.locator('searchBucketField').waitFor({ state: 'visible' });
    await this.selectSingleComboOption('searchBucketField', 'geo.src');
    await this.selectSingleComboOption('searchMetricField', 'memory');
    await this.datePicker.setAbsoluteRange(LOGSTASH_TIME_RANGE);
  }

  /**
   * Configures the Search Sessions demo: data view and metric field.
   */
  async configureSearchSessionDemo(): Promise<void> {
    await this.selectSingleComboOption('dataViewSelector', DATA_VIEW);
    await this.selectSingleComboOption('searchMetricField', 'bytes');
  }

  /**
   * Temporary until Apps DX supports replace-without-clear on comboBox.
   * Select by typing + exact option click (no clear). Always runs the select
   * path so unexpected state surfaces as a failure.
   */
  private async selectSingleComboOption(
    testSubj: string,
    label: string,
    { timeout = 10_000 }: { timeout?: number } = {}
  ): Promise<void> {
    const normalizedLabel = label.trim();
    const root = this.page.testSubj.locator(testSubj);
    await root.locator('[data-test-subj="comboBoxInput"]').click();
    const searchInput = root.locator('[data-test-subj="comboBoxSearchInput"]');
    await searchInput.fill(label);

    const listbox = this.page.getByRole('listbox');
    const exactLabel = new RegExp(`^${normalizedLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    const option = listbox.getByRole('option').filter({ hasText: exactLabel });
    await option.waitFor({ state: 'visible', timeout });
    await option.click();
    await listbox.waitFor({ state: 'hidden', timeout });
  }
}
