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

// Stable EUI combo-box `data-test-subj`s (the same ones the EUI helper uses internally).
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
 * - Adds {@link createOptions} — free-text creation via `onCreateOption`.
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
   * Create free-text options via the combo box's `onCreateOption` handler by
   * typing each label and pressing Enter. Use only for combos whose value
   * cannot pre-exist as a selectable option (tags, custom field names, date
   * formats). For a single-selection `asPlainText` combo, pass a single label.
   */
  async createOptions(labels: string[]): Promise<void> {
    await this.inputWrapper.click();
    for (const label of labels) {
      await this.searchField.fill(label);
      await this.searchField.press('Enter');
    }
    await this.searchField.blur();

    const selected = await this.getSelectedOptions();
    for (const label of labels) {
      expect(selected).toContain(label);
    }
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
   * keyboard fallback (`ArrowDown` + `Enter`) handles duplicate labels. Pass
   * `create` for `onCreateOption` combos to commit the typed value directly.
   */
  async setSelectedOptions(
    labels: string[],
    { create = false, timeout = 10_000 }: { create?: boolean; timeout?: number } = {}
  ): Promise<void> {
    for (const label of labels) {
      await this.inputWrapper.click();
      await this.searchField.fill(label);

      if (create) {
        // onCreateOption combo — commit the typed value directly. Do NOT fall
        // through to selection: on an async combo the pre-filter (stale) options
        // are still present right after typing, so we'd select a wrong suggestion.
        await this.searchField.press('Enter');
        await this.searchField.blur();
        continue;
      }

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
