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
   * Type `value` to filter the options, then select the matching one.
   *
   * Use this for the many Kibana combo boxes whose option list is **filterable,
   * virtualized, or backed by a suggestions API** — the option is not rendered
   * in the DOM until the search term is typed, so the base
   * {@link setSelectedOptions} (which never types) times out looking for it.
   *
   * Selection matches the option by its **accessible name**. While filtering, EUI
   * middle-truncates the visible option text (`EuiTextTruncate`, e.g. `by…es`) and
   * drops the option `title`, but the accessible name keeps the full label — so
   * `getByRole('option', { name })` resolves reliably where a text/title match
   * would not. Because it is a poll, it also waits out async / server-side
   * filtering (it only passes once the real match renders, never a stale
   * pre-filter suggestion). A single match is clicked; a keyboard fallback
   * (`ArrowDown` + `Enter`) handles duplicate labels. When `create` is set, the
   * typed value is committed directly via `onCreateOption` (Enter).
   */
  async searchAndSelect(
    value: string,
    { create = false, timeout = 10_000 }: { create?: boolean; timeout?: number } = {}
  ): Promise<void> {
    await this.inputWrapper.click();
    await this.searchField.fill(value);

    if (create) {
      // The combo accepts custom values (onCreateOption). Commit the typed value
      // directly — EUI selects an exact match or creates it. This must NOT fall
      // through to the keyboard path below: on an async combo the pre-filter
      // (stale) options are still present right after typing, so ArrowDown+Enter
      // would select a wrong, stale suggestion instead of the typed value.
      await this.searchField.press('Enter');
      await this.searchField.blur();
      return;
    }

    // Match the option by its accessible name. EUI keeps the full label accessible
    // even when the visible text is middle-truncated while filtering, and exact:false
    // tolerates a trailing type badge (e.g. a Lens field "bytes Number"). Crucially,
    // waiting for the NAMED option also waits out async / server-side filtering: the
    // poll only passes once the real match renders, so we never keyboard-select a
    // stale pre-filter suggestion.
    const option = this.optionsList().getByRole('option', { name: value });
    await expect.poll(() => option.count(), { timeout }).toBeGreaterThan(0);
    if ((await option.count()) === 1) {
      await option.click();
    } else {
      // Multiple substring matches (or a duplicate label) — keyboard-select the
      // highlighted (first filtered) match; avoids the nth-methods banned in kbn-scout.
      await this.searchField.press('ArrowDown');
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
    const optionsList = this.optionsList();
    // Wait for the dropdown to open, then read whatever options it holds. Waiting on the
    // list container (rather than polling the option count) avoids burning the full timeout
    // when a combo legitimately has no available options.
    await optionsList.waitFor({ state: 'visible' });
    return optionsList.getByRole('option').allInnerTexts();
  }
}
