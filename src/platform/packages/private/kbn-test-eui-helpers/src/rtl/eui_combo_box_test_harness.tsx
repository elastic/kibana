/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Safety guard: Backspace-based clearing should converge quickly. This is NOT a “max pills” limit;
// it prevents an infinite loop when Backspace doesn’t remove selections (e.g. focus not on input,
// different combo box mode, or unexpected DOM structure).
const MAX_BACKSPACE_PRESSES = 20;

export class EuiComboBoxTestHarness {
  #testId: string;

  /**
   * Returns the combobox container element or throws if not found.
   */
  get #containerEl() {
    return screen.getByTestId(this.#testId);
  }

  /**
   * Returns the toggle button element (data-test-subj="comboBoxToggleListButton") if present.
   *
   * NOTE: This test subject is not unique, so we always scope the query
   * to the combobox container (or its parent as a fallback).
   */
  get #toggleButtonEl() {
    const container = this.#containerEl;

    const toggleWithin = within(container).queryByTestId('comboBoxToggleListButton');
    if (toggleWithin) return toggleWithin;

    const parent = container.parentElement;
    if (parent) {
      const toggleInParent = within(parent).queryByTestId('comboBoxToggleListButton');
      if (toggleInParent) return toggleInParent;
    }

    return null;
  }

  /**
   * Returns the input element (role="combobox")
   * Finds it within or near the container.
   */
  get #inputEl() {
    const container = this.#containerEl;

    // If the consumer put `data-test-subj` on the input itself (EuiComboBox supports this),
    // `within(container).queryByRole('combobox')` won't find "self", only descendants.
    if (container.getAttribute('role') === 'combobox') return container;

    // Try within container first
    const inputWithin = within(container).queryByRole('combobox');
    if (inputWithin) return inputWithin;

    // Try in parent
    const parent = container.parentElement;
    if (parent) {
      if (parent.getAttribute('role') === 'combobox') return parent;
      const inputInParent = within(parent).queryByRole('combobox');
      if (inputInParent) return inputInParent;
    }

    throw new Error(`Could not find combobox input for testId: ${this.#testId}`);
  }

  constructor(testId: string) {
    this.#testId = testId;
  }

  /**
   * Returns `data-test-subj` of the combobox container.
   */
  public get testId() {
    return this.#testId;
  }

  /**
   * Returns combobox container if found, otherwise `null`.
   */
  public getElement(): HTMLElement | null {
    return screen.queryByTestId(this.#testId);
  }

  /**
   * Returns selected values as array of strings.
   *
   * Use when:
   * - You need to assert what the combobox currently has selected.
   *
   * Behavior:
   * - Returns pill labels from `data-test-subj="euiComboBoxPill"` when pills exist.
   * - For `singleSelection: { asPlainText: true }`, returns the input value (EUI does not render pills).
   * - Returns `[]` if the combobox is not found.
   */
  public getSelected(): string[] {
    const el = this.getElement();
    if (!el) return [];
    const pills = within(el).queryAllByTestId('euiComboBoxPill');
    if (pills.length > 0) return pills.map((pill) => pill.textContent || '');

    // For `singleSelection: { asPlainText: true }`, EUI does not render pills.
    // In that mode the selected option's label is rendered into the input value.
    const input = this.#inputEl as HTMLInputElement;
    return input.value ? [input.value] : [];
  }

  /**
   * Select an option by searching and clicking its option.
   *
   * Use when:
   * - The combo box shows an options list (suggestions) and you want to pick an existing option.
   * - The options may be populated asynchronously (via `onSearchChange`).
   *
   * Behavior:
   * - Opens the popover (prefers the scoped toggle button for deterministic opening).
   * - Waits for `aria-expanded="true"` before typing (prevents late popover updates/act warnings).
   * - Types the search text, then selects an option (prefers exact match, falls back to fuzzy).
   * - Clicks the option via `user.click()` so EUI popover updates are wrapped in RTL `act()`.
   * - Falls back to `Enter` only when no options list renders / no option is found.
   * - For pill-based combos, waits until selection propagates into pills.
   *
   * Notes:
   * - Prefer passing the display label (not internal value) when applicable
   *   (e.g. use 'Semantic text' not 'semantic_text').
   * - For createable/free-form fields (index patterns, seed nodes), prefer `addCustomValue()`.
   */
  public async select(searchText: string, { timeout = 5000 }: { timeout?: number } = {}) {
    const input = this.#inputEl as HTMLElement;

    // Focus and open dropdown (or re-open if closed from previous selection).
    fireEvent.focus(input);

    // Prefer the toggle button for deterministic opening (input click does not always open).
    const toggle = this.#toggleButtonEl;
    if (input.getAttribute('aria-expanded') !== 'true') {
      if (toggle) {
        fireEvent.click(toggle);
      } else {
        fireEvent.click(input);
      }
    }

    // Opening the popover can be async (EUI schedules internal updates).
    // Waiting here keeps those updates within RTL's act() and avoids stray act warnings.
    await waitFor(
      () => {
        if (input.getAttribute('aria-expanded') !== 'true') {
          throw new Error('ComboBox did not open yet');
        }
      },
      { timeout: Math.min(timeout, 1000) }
    );

    // Type the search text - this triggers async `onSearchChange`.
    fireEvent.change(input, { target: { value: searchText } });

    const optionsListTestId = new RegExp(`${escapeRegExp(this.#testId)}-optionsList`);

    // The options list should appear quickly once the popover is open. Avoid waiting the full
    // selection timeout just to detect "no list" (which can happen for free-form combos).
    const optionsList = await waitFor(
      () => {
        const list = screen.queryByTestId(optionsListTestId);
        if (!list) throw new Error('Options list not found');
        return list;
      },
      { timeout: Math.min(timeout, 1000) }
    ).catch(() => null);

    if (optionsList) {
      const findOption = () => {
        const exactMatcher = new RegExp(`^${escapeRegExp(searchText)}$`, 'i');
        const fuzzyMatcher = new RegExp(escapeRegExp(searchText), 'i');

        const exactMatches = within(optionsList).queryAllByRole('option', { name: exactMatcher });
        if (exactMatches[0]) return exactMatches[0];

        const fuzzyMatches = within(optionsList).queryAllByRole('option', { name: fuzzyMatcher });
        return fuzzyMatches[0] ?? null;
      };

      // Prefer an exact (case-insensitive) match; fall back to substring match.
      // Use *AllBy* queries to avoid "Found multiple elements" errors when
      // multiple nodes contain the same text (e.g. virtualization wrappers).
      let option: HTMLElement | null = findOption();

      // If EUI is still loading options asynchronously, wait for the loading state to clear
      // before giving up and falling back to Enter (custom option).
      if (!option && within(optionsList).queryByText(/Loading options/i)) {
        await waitFor(
          () => {
            if (within(optionsList).queryByText(/Loading options/i)) {
              throw new Error('Options still loading');
            }
          },
          { timeout }
        );
        option = findOption();
      }

      // If the list rendered but the option isn't there yet, give async option providers
      // a brief chance to populate results before we fall back to creating a custom option.
      if (!option) {
        option = await waitFor(
          () => {
            const found = findOption();
            if (!found) {
              throw new Error(`Option not found yet for "${searchText}"`);
            }
            return found;
          },
          { timeout: Math.min(timeout, 1000) }
        ).catch(() => null);
      }

      if (option) {
        // Lazily create userEvent only when we need to click an existing option.
        // For "createable" combo boxes (no options list) we usually fall back to Enter,
        // and creating a userEvent instance on every selection can add significant overhead.
        const user = userEvent.setup({ pointerEventsCheck: 0, delay: null });
        await user.click(option);
      } else {
        // If the list rendered but we couldn't match text, fall back to Enter (custom option)
        fireEvent.keyDown(input, { key: 'Enter' });
      }
    } else {
      // No list (e.g. custom options) - commit via Enter.
      fireEvent.keyDown(input, { key: 'Enter' });
    }

    // Wait for selection to propagate when pills are used (multi-select and most single-select).
    // For `singleSelection.asPlainText`, EUI doesn't render pills; in that mode, tests should
    // assert via downstream UI boundaries (e.g. "Next" enabled) rather than waiting here.
    const el = this.getElement();
    const hasPills = el ? within(el).queryAllByTestId('euiComboBoxPill').length > 0 : false;
    if (hasPills) {
      await waitFor(
        () => {
          const selected = this.getSelected().map((s) => s.toLowerCase());
          if (!selected.includes(searchText.toLowerCase())) {
            throw new Error(
              `Selection did not propagate for: "${searchText}". Current: ${JSON.stringify(
                this.getSelected()
              )}`
            );
          }
        },
        { timeout }
      );
    }
  }

  /**
   * Add a custom value to a "createable" combo box (free-form input + Enter).
   *
   * Use when:
   * - The combo box is createable/free-form (e.g. uses `onCreateOption` / `noSuggestions`).
   * - You are entering user-provided values (index patterns, remote cluster seeds, etc).
   *
   * Behavior:
   * - Focuses the input, sets the input value, presses Enter to commit.
   * - Does not open/wait for an options list or attempt option matching.
   *
   * Notes:
   * - This does not verify that the value was accepted/created. Createable comboboxes vary:
   *   some render pills, some write selection into the input (asPlainText), and some clear the
   *   input after creation. Prefer asserting via a downstream UI boundary (e.g. Next enabled,
   *   validation cleared) or via `getSelected()` when pills exist.
   * - Some combos still render a popover as you type; call `close()` when you need deterministic
   *   portal cleanup before the next interaction.
   */
  public addCustomValue(value: string) {
    const input = this.#inputEl as HTMLElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value } });
    fireEvent.keyDown(input, { key: 'Enter' });
  }

  /**
   * Clear all selected options and wait for the UI to settle.
   *
   * Use when:
   * - You need to remove all selected values deterministically before the next step/assertion.
   *
   * Behavior:
   * - Clicks `comboBoxClearButton` if present (searches both the container and its parent).
   * - Otherwise falls back to removing selections via Backspace (guarded to avoid infinite loops).
   * - Waits until both selections AND any pending input text are cleared.
   *
   * Notes:
   * - Some EUI usages render `comboBoxClearButton` outside the element with the consumer-provided
   *   `data-test-subj` (e.g. on a wrapper), hence the broader search.
   */
  public async clear() {
    const el = this.getElement();
    if (!el) return;

    const scope = el.parentElement ?? el;

    const clearButton =
      within(el).queryByTestId('comboBoxClearButton') ??
      within(scope).queryByTestId('comboBoxClearButton');

    if (clearButton) {
      fireEvent.click(clearButton);
    } else {
      const input = this.#inputEl;

      // Focus/click so Backspace removes the last selected pill.
      fireEvent.focus(input);
      fireEvent.click(input);

      for (let i = 0; i < MAX_BACKSPACE_PRESSES; i++) {
        if (this.getSelected().length === 0) break;
        fireEvent.keyDown(input, { key: 'Backspace' });
      }

      // Clear any pending input text (search value).
      fireEvent.change(input, { target: { value: '' } });
    }

    await waitFor(() => {
      const selected = this.getSelected();
      const inputValue = (this.#inputEl as HTMLInputElement).value ?? '';

      if (selected.length === 0 && inputValue === '') return;

      throw new Error(
        `ComboBox did not clear. Still selected: ${JSON.stringify(
          selected
        )}, input: "${inputValue}"`
      );
    });
  }

  /**
   * Returns true if the combobox popover is currently open.
   *
   * Use when:
   * - You need a quick check in a test/cleanup path.
   *
   * Behavior:
   * - Returns `aria-expanded === 'true'` from the combobox input.
   *
   * NOTE: Some EUI variants can temporarily desync `aria-expanded` from the portal-mounted
   * options list. For cleanup, prefer `close()` / `waitForClosed()` which also checks
   * for options list unmounting.
   */
  public isOpen(): boolean {
    const el = this.getElement();
    if (!el) return false;
    return this.#inputEl.getAttribute('aria-expanded') === 'true';
  }

  /**
   * Best-effort close of the combo box popover.
   *
   * Use when:
   * - You need deterministic cleanup of the portal/popup (prevent cross-test interference).
   * - The combo box does not auto-close after selection (common for multi-select).
   *
   * Behavior:
   * - Tries to close via the scoped toggle button; falls back to Escape + outside click.
   * - Waits for `aria-expanded !== 'true'` AND for the portal-mounted options list to unmount.
   *
   * Notes:
   * - Prefer `waitForClosed()` for single-selection combos that should auto-close on selection.
   */
  public async close({ timeout = 5000 }: { timeout?: number } = {}) {
    const el = this.getElement();
    if (!el) return;

    const input = this.#inputEl as HTMLElement;
    const optionsListTestId = new RegExp(`${escapeRegExp(this.#testId)}-optionsList`);
    const isExpanded = input.getAttribute('aria-expanded') === 'true';
    const hasOptionsList = Boolean(screen.queryByTestId(optionsListTestId));

    // Some EUI combobox variants can leave the options list rendered even when `aria-expanded`
    // isn't updated as expected. Treat either signal as "open".
    if (!isExpanded && !hasOptionsList) return;

    const toggle = this.#toggleButtonEl;
    if (toggle) {
      fireEvent.click(toggle);
    } else {
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
      // Fallback for portals in JSDOM: click outside to encourage popover close
      fireEvent.mouseDown(document.body);
      fireEvent.click(document.body);
    }

    await waitFor(
      () => {
        if (input.getAttribute('aria-expanded') === 'true') {
          throw new Error(`ComboBox "${this.#testId}" did not close`);
        }
      },
      { timeout }
    );

    // Also wait for the popover panel/options list to unmount.
    // This helps prevent observer-driven async updates that can surface as `act(...)` warnings
    // after the test has moved on.
    await waitFor(
      () => {
        if (screen.queryByTestId(optionsListTestId)) {
          throw new Error(`ComboBox "${this.#testId}" options list did not unmount`);
        }
      },
      { timeout }
    );
  }

  /**
   * Passive wait until the combobox popover is closed/unmounted.
   *
   * Use when:
   * - The popover should close automatically (common for singleSelection), and you just need to
   *   wait for it to settle before continuing.
   *
   * Behavior:
   * - Waits for `aria-expanded !== 'true'` and for the options list to be unmounted.
   *
   * Notes:
   * - Prefer this over `close()` when you want to avoid “toggle-clicking” a popover that is
   *   already in the process of closing.
   */
  public async waitForClosed({ timeout = 5000 }: { timeout?: number } = {}) {
    const el = this.getElement();
    if (!el) return;

    const input = this.#inputEl as HTMLElement;
    const optionsListTestId = new RegExp(`${escapeRegExp(this.#testId)}-optionsList`);

    await waitFor(
      () => {
        if (input.getAttribute('aria-expanded') === 'true') {
          throw new Error(`ComboBox "${this.#testId}" is still expanded`);
        }
        if (screen.queryByTestId(optionsListTestId)) {
          throw new Error(`ComboBox "${this.#testId}" options list is still mounted`);
        }
      },
      { timeout }
    );
  }

  /**
   * Select an option and then close the popover.
   *
   * Use when:
   * - You select from an options list and want deterministic portal cleanup after the selection.
   * - The popover is expected to remain open after selection (common for multi-select).
   *
   * Behavior:
   * - Calls `select()` then `close()`.
   */
  public async selectAndClose(label: string, { timeout = 5000 }: { timeout?: number } = {}) {
    await this.select(label, { timeout });
    await this.close({ timeout });
  }
}
