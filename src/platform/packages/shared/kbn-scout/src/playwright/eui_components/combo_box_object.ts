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
 * Kibana-specific extension of {@link EuiComboBoxObject}.
 *
 * The published `EuiComboBoxObject` deliberately exposes only the minimal,
 * configuration-agnostic surface — `setSelectedOptions` / `getSelectedOptions` /
 * `clear` — which covers the vast majority of Kibana combo-box tests (pick an
 * existing option, read the selection, clear it). **Prefer those.**
 *
 * This subclass adds the few interactions the minimal helper intentionally does
 * not cover, for cases that genuinely need them (see the per-test migration
 * analysis):
 * - {@link createOptions} — free-text creation via `onCreateOption` (e.g. rule
 *   tags, custom field names, date-format strings: values that cannot pre-exist).
 * - {@link searchAndSelect} — type a term to surface a server-side / virtualized
 *   suggestion, then select it (the option is not in the DOM until you type).
 * - {@link getAvailableOptions} — read the available (unselected) dropdown
 *   options, for tests that assert on the option list itself.
 *
 * The interaction bodies are ported from the prior `EuiComboBoxWrapper` logic.
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
   * Type `value` to surface a server-side / virtualized suggestion, then click
   * the matching option. When the option list is backed by a suggestions API,
   * the option is not in the DOM until the search term is typed (which is why
   * {@link setSelectedOptions} cannot be used). If `create` is set and no
   * matching option appears within `timeout`, the typed value is committed via
   * `onCreateOption` (Enter) — for combos that allow it under empty suggestions.
   */
  async searchAndSelect(
    value: string,
    { create = false, timeout = 10_000 }: { create?: boolean; timeout?: number } = {}
  ): Promise<void> {
    await this.inputWrapper.click();
    await this.searchField.fill(value);

    const option = this.optionsList().getByRole('option', { name: value, exact: false });
    try {
      await option.first().waitFor({ state: 'visible', timeout });
      await option.first().click();
    } catch (error) {
      if (!create) {
        throw error;
      }
      // Suggestions can be empty (e.g. serverless under load) — commit the typed value.
      await this.searchField.press('Enter');
    }
    await this.searchField.blur();
  }

  /**
   * Open the dropdown and return the labels of the currently-available options.
   * For tests that assert on the option list itself (e.g. no duplicate names,
   * options are populated) rather than on the selection.
   */
  async getAvailableOptions(): Promise<string[]> {
    await this.inputWrapper.click();
    const options = this.optionsList().getByRole('option');
    await options.first().waitFor({ state: 'visible' });
    return options.allInnerTexts();
  }
}
