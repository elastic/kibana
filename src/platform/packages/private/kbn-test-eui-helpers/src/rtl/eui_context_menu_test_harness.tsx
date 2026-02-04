/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, waitFor, within } from '@testing-library/react';

/**
 * Harness for context menus rendered inside EUI popovers.
 *
 * Note: EUI context menu items may render as `<button>` or `<a>` depending on props.
 */
export class EuiContextMenuTestHarness {
  #panelEl: HTMLElement;

  constructor(panelEl: HTMLElement) {
    this.#panelEl = panelEl;
  }

  /**
   * Returns the popover panel element if it is still in the DOM, otherwise `null`.
   */
  public getElement(): HTMLElement | null {
    return document.body.contains(this.#panelEl) ? this.#panelEl : null;
  }

  /**
   * Get a clickable context menu item (button or link) by its accessible name.
   * Returns `null` if not found.
   */
  public getMenuItem(label: string | RegExp): HTMLElement | null {
    return (
      (within(this.#panelEl).queryByRole('button', { name: label }) as HTMLElement | null) ??
      (within(this.#panelEl).queryByRole('link', { name: label }) as HTMLElement | null) ??
      null
    );
  }

  public clickMenuItem(label: string | RegExp) {
    const item = this.getMenuItem(label);
    if (!item) {
      throw new Error(`Expected context menu item "${String(label)}" to exist`);
    }
    fireEvent.click(item);
  }

  public async clickMenuItemAndWaitForClose(label: string | RegExp) {
    this.clickMenuItem(label);
    await waitFor(() => {
      if (document.body.contains(this.#panelEl)) {
        throw new Error('Expected context menu popover panel to close');
      }
    });
  }
}
