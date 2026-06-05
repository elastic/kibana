/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';
import { expect } from '..';

interface BasicFilterOptions {
  field: string;
}
interface FilterWithSingleValue extends BasicFilterOptions {
  operator: 'is' | 'is not';
  value: string;
}
interface FilterWithMultipleValues extends BasicFilterOptions {
  operator: 'is one of' | 'is not one of';
  value: string[];
}
interface FilterWithRange extends BasicFilterOptions {
  operator: 'is between' | 'is not between';
  value: { from?: string; to?: string };
}
interface FilterWithoutValue extends BasicFilterOptions {
  operator: 'exists' | 'does not exist';
  value?: never;
}
export type FilterCreationOptions =
  | FilterWithSingleValue
  | FilterWithMultipleValues
  | FilterWithRange
  | FilterWithoutValue;

interface FilterStateOptions {
  field: string;
  value?: string;
  enabled?: boolean;
  pinned?: boolean;
  negated?: boolean;
}

export class FilterBar {
  constructor(private readonly page: ScoutPage) {}

  async addFilter(options: FilterCreationOptions) {
    await this.page.testSubj.click('addFilter');
    await this.page.testSubj.waitForSelector('addFilterPopover');
    // set field name
    await this.page.testSubj.typeWithDelay(
      'filterFieldSuggestionList > comboBoxSearchInput',
      options.field
    );
    await this.page.click(`.euiComboBoxOption[title="${options.field}"]`);
    // set operator
    await expect(this.page.testSubj.locator('filterOperatorList')).not.toHaveClass(
      /euiComboBox-isDisabled/
    );
    await this.page.testSubj.typeWithDelay(
      'filterOperatorList > comboBoxSearchInput',
      options.operator
    );
    await this.page.click(`.euiComboBoxOption[title="${options.operator}"]`);

    switch (options.operator) {
      case 'exists':
      case 'does not exist':
        // No params input rendered for value-less operators.
        break;

      case 'is between':
      case 'is not between': {
        const startInput = this.page.testSubj.locator('range-start');
        const endInput = this.page.testSubj.locator('range-end');
        if (options.value.from !== undefined) {
          await startInput.fill(options.value.from);
        }
        if (options.value.to !== undefined) {
          await endInput.fill(options.value.to);
        }
        break;
      }

      case 'is one of':
      case 'is not one of': {
        const input = this.page.locator('[data-test-subj="filterParams"] input');
        await expect(input).toBeEditable();
        await input.focus();
        for (const v of options.value) {
          await this.page.typeWithDelay('[data-test-subj="filterParams"] input', v);
          await input.press('Enter');
        }
        break;
      }

      default: {
        // single-value `is` / `is not`
        const filterParamsInput = this.page.locator('[data-test-subj="filterParams"] input');
        await expect(filterParamsInput).not.toHaveAttribute('disabled');
        await expect(filterParamsInput).toBeEditable();
        await filterParamsInput.focus();
        await this.page.typeWithDelay('[data-test-subj="filterParams"] input', options.value);
      }
    }
    // save filter and wait for popover to close
    await this.page.testSubj.click('saveFilter');
    await expect(
      this.page.testSubj.locator('addFilterPopover'),
      'Filter popover should close after saving'
    ).toBeHidden();

    await expect(
      this.page.testSubj.locator('^filter-badge'),
      'New filter badge should be displayed'
    ).toBeVisible();
  }

  async hasFilter(options: FilterStateOptions) {
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

    return this.page.testSubj.isVisible(testSubjLocator, { strict: true });
  }

  /**
   * Open the popover for the filter pill matching `key` (the field name) and
   * click the named action. Mirrors FTR `filterBar.removeFilter`,
   * `toggleFilterPinned`, `toggleFilterNegated`.
   */
  private async clickFilterPillAction(
    key: string,
    action: 'deleteFilter' | 'pinFilter' | 'negateFilter'
  ) {
    const pill = this.page.testSubj.locator(`~filter & ~filter-key-${key}`);
    await pill.click();
    await this.page.testSubj.click(action);
    // Filter pill popover dismisses on action; wait so the next assertion
    // doesn't race the re-render.
    await expect(this.page.testSubj.locator(action)).toBeHidden();
  }

  async removeFilter(key: string): Promise<void> {
    await this.clickFilterPillAction(key, 'deleteFilter');
  }

  async toggleFilterPinned(key: string): Promise<void> {
    await this.clickFilterPillAction(key, 'pinFilter');
  }

  async toggleFilterNegated(key: string): Promise<void> {
    await this.clickFilterPillAction(key, 'negateFilter');
  }

  /**
   * The filter-bar source attaches multiple state tokens to each pill's
   * `data-test-subj` (e.g. `filter filter-enabled filter-pinned filter-key-foo`).
   * Reading the raw attribute is more reliable than relying on
   * `~filter-pinned` matching, because the unpinned form has its own token
   * (`filter-unpinned`) that also satisfies an `includes('filter-pinned')`
   * substring check — so we explicitly look for the boundary form `~filter-pinned `.
   */
  private async readPillTestSubj(key: string): Promise<string> {
    const pill = this.page.testSubj.locator(`~filter & ~filter-key-${key}`);
    return (await pill.getAttribute('data-test-subj')) ?? '';
  }

  async isFilterPinned(key: string): Promise<boolean> {
    const tokens = (await this.readPillTestSubj(key)).split(/\s+/);
    return tokens.includes('filter-pinned');
  }

  async isFilterNegated(key: string): Promise<boolean> {
    const tokens = (await this.readPillTestSubj(key)).split(/\s+/);
    return tokens.includes('filter-negated');
  }

  async getFilterCount(): Promise<number> {
    return this.page.testSubj.locator('~filter').count();
  }
}
