/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutPage } from '../fixtures/types';
import { expect } from '..';

interface AddFilterOptions {
  field: string;
  operator: 'is' | 'is not' | 'is one of' | 'is not one of' | 'exists' | 'does not exist';
  value: string;
}

interface FilterExistsOptions {
  field: string;
  value: string;
  enabled?: boolean;
  pinned?: boolean;
  negated?: boolean;
}

export class FilterBar {
  constructor(private readonly page: ScoutPage) {}

  addFilter = async (options: AddFilterOptions) => {
    await this.page.testSubj.click('addFilter');
    await this.page.testSubj.waitForSelector('addFilterPopover');
    // set field name
    await this.page.testSubj.typeWithDelay(
      'filterFieldSuggestionList > comboBoxSearchInput',
      options.field
    );
    await this.page.click(`.euiFilterSelectItem[title="${options.field}"]`);
    // set operator
    await this.page.testSubj.typeWithDelay(
      'filterOperatorList > comboBoxSearchInput',
      options.operator
    );
    await this.page.click(`.euiFilterSelectItem[title="${options.operator}"]`);
    // set value
    await this.page.testSubj.locator('filterParams').locator('input').fill(options.value);
    // save filter
    await this.page.testSubj.click('saveFilter');

    await expect(this.page.testSubj.locator('^filter-badge')).toBeVisible();
  };

  hasFilter(options: FilterExistsOptions) {
    const testSubjLocator = [
      '~filter',
      options.enabled !== undefined && `~filter-${options.enabled ? 'enabled' : 'disabled'}`,
      options.field && `~filter-key-${options.field}`,
      options.value && `~filter-value-${options.value}`,
      options.pinned !== undefined && `~filter-${options.pinned ? 'pinned' : 'unpinned'}`,
      options.negated !== undefined && (options.negated ? '~filter-negated' : ''),
    ]
      .filter(Boolean)
      .join(' & ');

    return this.page.testSubj.locator(testSubjLocator);
  }
}
