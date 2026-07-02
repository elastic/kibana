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
   * Type `value` to filter the options, then select the first match by keyboard.
   *
   * Use this for the many Kibana combo boxes whose option list is **filterable,
   * virtualized, or backed by a suggestions API** — the option is not rendered
   * in the DOM until the search term is typed, so the base
   * {@link setSelectedOptions} (which never types) times out looking for it.
   *
   * Selection is keyboard-based (`ArrowDown` + `Enter`) on purpose: while the
   * input has a search value EUI middle-truncates the rendered option text
   * (`EuiTextTruncate`, e.g. `by…es`) and drops the option `title`, so the
   * option's text / title / accessible name are all unreliable to match on.
   * Keyboard selection of the highlighted match sidesteps that entirely (this is
   * how the pre-helper combo-box utilities selected filtered options). If `create`
   * is set and no option renders within `timeout`, the typed value is committed
   * via `onCreateOption` (Enter).
   */
  async searchAndSelect(
    value: string,
    { create = false, timeout = 10_000 }: { create?: boolean; timeout?: number } = {}
  ): Promise<void> {
    await this.inputWrapper.click();
    await this.searchField.fill(value);

    // Wait for the filtered list to render at least one real option. Gating on the
    // presence of an option (not on its text) is truncation-proof — see above.
    const options = this.optionsList().getByRole('option');
    try {
      await expect.poll(() => options.count(), { timeout }).toBeGreaterThan(0);
    } catch (error) {
      if (!create) {
        throw error;
      }
      // No matching option (free-text combo, or empty serverless suggestions) —
      // commit the typed value via onCreateOption.
      await this.searchField.press('Enter');
      await this.searchField.blur();
      return;
    }

    await this.searchField.press('ArrowDown');
    await this.searchField.press('Enter');
    await this.searchField.blur();
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
