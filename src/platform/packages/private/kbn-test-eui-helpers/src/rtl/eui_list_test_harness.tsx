/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, screen, within } from '@testing-library/react';

export interface EuiListTestHarnessOptions {
  /**
   * Optional selector to identify the "row" element for an item label (e.g. `li`, `[role="option"]`, `tr`).
   *
   * If provided, action lookup will start at the closest matching ancestor.
   */
  rowSelector?: string;

  /**
   * Optional callback to identify the "row" element for an item label.
   *
   * Prefer this over `rowSelector` for complex DOM where a CSS selector is not sufficient.
   */
  getRow?: (labelEl: HTMLElement, containerEl: HTMLElement) => HTMLElement | null;
}

/**
 * Generic harness for EUI "list-ish" UIs (selectables, list groups, option lists) where:
 * - Items are rendered as repeated DOM nodes containing an item label text
 * - Row actions are rendered somewhere "near" the label (often not a strict parent/child relationship)
 *
 * This harness encapsulates the common pattern:
 * - locate item by visible label text
 * - walk up a bounded number of ancestors until the action button is found
 * - click it
 */
export class EuiListTestHarness {
  #testId: string;
  #options?: EuiListTestHarnessOptions;

  get #containerEl() {
    return screen.getByTestId(this.#testId);
  }

  constructor(testId: string, options?: EuiListTestHarnessOptions) {
    this.#testId = testId;
    this.#options = options;
  }

  public get testId() {
    return this.#testId;
  }

  public get self() {
    return screen.queryByTestId(this.#testId);
  }

  #getRowRoot(labelEl: HTMLElement): HTMLElement | null {
    const containerEl = this.#containerEl;
    const { getRow, rowSelector } = this.#options ?? {};

    const userRoot =
      getRow?.(labelEl, containerEl) ??
      (rowSelector ? (labelEl.closest(rowSelector) as HTMLElement | null) : null);

    // Ensure we never search outside the harness container.
    if (userRoot && containerEl.contains(userRoot)) return userRoot;

    return null;
  }

  /**
   * Click an action button associated with an item label.
   *
   * @example
   * const list = new EuiListTestHarness('componentTemplatesList');
   * list.clickItemAction('test_component_template_1', 'action-plusInCircle');
   */
  public clickItemAction(itemLabel: string, actionTestId: string) {
    const labelEl = within(this.#containerEl).getByText(itemLabel);
    const actionEl = this.getItemActionElement(labelEl as HTMLElement, actionTestId);
    fireEvent.click(actionEl);
  }

  /**
   * Return the action element for an item label (bounded ancestor walk).
   * Exposed to enable assertions before clicking if needed.
   */
  public getItemActionElement(labelEl: HTMLElement, actionTestId: string) {
    const containerEl = this.#containerEl;
    const rowRoot = this.#getRowRoot(labelEl);
    let el: HTMLElement | null = rowRoot ?? labelEl;

    // Walk upwards but never beyond the harness container.
    while (el) {
      const matches = within(el).queryAllByTestId(actionTestId);
      if (matches.length === 1) return matches[0];
      if (matches.length > 1 && el === containerEl) {
        throw new Error(
          `Found multiple actions "${actionTestId}" for item "${
            labelEl.textContent ?? ''
          }" within "${this.#testId}". ` +
            `Pass { rowSelector } or { getRow } to EuiListTestHarness to scope actions to a single row.`
        );
      }

      if (el === containerEl) break;
      el = el.parentElement;
    }

    throw new Error(
      `Unable to find action "${actionTestId}" for item "${labelEl.textContent ?? ''}" within "${
        this.#testId
      }". ` +
        `If the action is not a descendant of the label's row, pass { rowSelector } or { getRow } to EuiListTestHarness.`
    );
  }
}
