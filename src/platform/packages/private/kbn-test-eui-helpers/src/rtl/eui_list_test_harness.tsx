/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, screen, within } from '@testing-library/react';

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

  get #containerEl() {
    return screen.getByTestId(this.#testId);
  }

  constructor(testId: string) {
    this.#testId = testId;
  }

  public get testId() {
    return this.#testId;
  }

  public get self() {
    return screen.queryByTestId(this.#testId);
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
    let el: HTMLElement | null = labelEl;

    // Bound the walk so we fail fast and don't accidentally traverse the whole document.
    for (let i = 0; i < 12 && el; i++) {
      const action = within(el).queryByTestId(actionTestId);
      if (action) return action;

      if (el === this.#containerEl) break;
      el = el.parentElement;
    }

    throw new Error(
      `Unable to find action "${actionTestId}" for item "${labelEl.textContent ?? ''}" within "${
        this.#testId
      }"`
    );
  }
}
