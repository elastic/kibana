/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiComboBoxObject } from '@elastic/eui-test-helpers';
import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

// EUI's internal combo-box `data-test-subj`s (mirror the eui-helper's own selectors).
const INPUT_WRAPPER_TEST_SUBJ = 'comboBoxInput';
const SEARCH_INPUT_TEST_SUBJ = 'comboBoxSearchInput';

/**
 * Kibana-specific extension of {@link EuiComboBoxObject}. Interim, until the
 * published helper can drive these cases itself — then delete this class; call
 * sites use the same method names, so they won't change.
 *
 * - Overrides {@link setSelectedOptions} to **type-to-filter, then select by
 *   accessible name**. The base implementation never types (it matches an
 *   unfiltered `getByTitle`), so it times out on the many Kibana combo boxes whose
 *   options are filterable / virtualized / async — the option is not in the DOM
 *   until you type. Kept as the same method name on purpose: when this behavior
 *   lands in the EUI helper, deleting this override needs no test changes.
 * - Adds {@link setCustomSelectedOptions} to create free-text `onCreateOption` values.
 * - Adds {@link getAvailableOptions} — read the available dropdown options.
 */
export class KbnComboBoxObject extends EuiComboBoxObject {
  private get inputWrapper(): Locator {
    return this.root.getByTestId(INPUT_WRAPPER_TEST_SUBJ);
  }

  private get searchField(): Locator {
    return this.root.getByTestId(SEARCH_INPUT_TEST_SUBJ);
  }

  /**
   * Options list rendered in a portal outside `root`. EUI propagates the
   * consumer's `data-test-subj` to the list as `${testSubj}-optionsList`, so we
   * scope to this combo's list to stay safe when several combos coexist.
   */
  private optionsList(): Locator {
    return this.root.page().locator(`[data-test-subj~="${this.testSubj}-optionsList"]`);
  }

  /**
   * Smart replacement for the base {@link EuiComboBoxObject.setSelectedOptions}:
   * type each label to filter, then select the option matched by its **accessible
   * name**.
   *
   * Why override: while filtering, EUI middle-truncates the visible option text
   * (`EuiTextTruncate`, e.g. `by…es`) and drops the option `title`, but the
   * accessible name keeps the full label — so `getByRole('option', { name })`
   * resolves reliably where a text/title match would not. Being a poll, it also
   * waits out async / server-side filtering (it only passes once the real match
   * renders, never a stale pre-filter suggestion). A single match is clicked; a
   * keyboard fallback (`ArrowDown` + `Enter`) handles duplicate labels.
   *
   * For free-text `onCreateOption` combos use {@link setCustomSelectedOptions}.
   */
  async setSelectedOptions(
    labels: string[],
    { timeout = 2500 }: { timeout?: number } = {}
  ): Promise<void> {
    for (const label of labels) {
      await this.inputWrapper.click();
      await this.searchField.fill(label);

      const option = this.optionsList().getByRole('option', { name: label });
      await expect.poll(() => option.count(), { timeout }).toBeGreaterThan(0);
      if ((await option.count()) === 1) {
        await option.click();
      } else {
        // Duplicate label / multiple substring matches — keyboard-select the
        // highlighted match; avoids the nth-methods banned in kbn-scout.
        await this.searchField.press('ArrowDown');
        await this.searchField.press('Enter');
      }
      await this.searchField.blur();
    }
  }

  /**
   * Set free-text values on an `onCreateOption` combo box (tags, custom field
   * names, date formats) — values that don't pre-exist as selectable options.
   * Each label is typed and committed via Enter, then the selection is verified
   * so a silently-rejected value fails loudly.
   *
   * Distinct from {@link setSelectedOptions} on purpose: this **creates a custom
   * selection**, it does not pick an existing option — the value won't appear in
   * the available-options list afterwards, so the two are not interchangeable.
   */
  async setCustomSelectedOptions(
    labels: string[],
    { timeout = 2500 }: { timeout?: number } = {}
  ): Promise<void> {
    for (const label of labels) {
      await this.inputWrapper.click();
      await this.searchField.fill(label);
      await this.searchField.press('Enter');
      await this.searchField.blur();
    }

    // The typed value equals the resulting pill/input label, so an exact
    // membership check is safe here (unlike filter-and-pick selection).
    for (const label of labels) {
      await expect.poll(() => this.getSelectedOptions(), { timeout }).toContain(label);
    }
  }

  /**
   * Read the selected-pill labels by the `.euiComboBoxPill` **class** rather than
   * the base helper's `data-test-subj`.
   *
   * Why override: EUI spreads an option's own `data-test-subj` onto its rendered
   * pill *after* the pill's default `data-test-subj="euiComboBoxPill"`, so a combo
   * that sets a per-option subj (e.g. the ES|QL values control stamps the value
   * as the subj) overrides it — and the base's `getByTestId('euiComboBoxPill')`
   * read comes back empty. The `.euiComboBoxPill` class is always present, so a
   * class read is robust (this is what the legacy wrapper did). Still scoped to
   * `root`, and falls back to `super` when there are no pills so `asPlainText`
   * (input-value) selections keep working unchanged.
   */
  async getSelectedOptions(): Promise<string[]> {
    const pills = this.root.locator('.euiComboBoxPill');
    if ((await pills.count()) > 0) {
      return pills.allInnerTexts();
    }
    return super.getSelectedOptions();
  }

  /**
   * Open the dropdown and return the labels of the currently-available options.
   * For tests that assert on the option list itself (e.g. no duplicate names,
   * options are populated) rather than on the selection.
   */
  async getAvailableOptions(): Promise<string[]> {
    await this.inputWrapper.click();
    const optionsList = this.optionsList();
    // Wait for the dropdown to open, then read whatever options it holds. Waiting on the
    // list container (rather than polling the option count) avoids burning the full timeout
    // when a combo legitimately has no available options.
    await optionsList.waitFor({ state: 'visible' });
    return optionsList.getByRole('option').allInnerTexts();
  }
}
