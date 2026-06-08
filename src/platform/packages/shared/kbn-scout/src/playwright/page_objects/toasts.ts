/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiToastWrapper } from '../eui_components';
import type { ScoutPage } from '../fixtures/scope/test';

export class Toasts {
  private readonly toast: EuiToastWrapper;
  constructor(private readonly page: ScoutPage) {
    this.toast = new EuiToastWrapper(this.page, {
      locator: '.euiToast',
    });
  }

  async waitFor() {
    await this.toast.getWrapper().waitFor({ state: 'visible', timeout: 10000 });
  }

  async getHeaderText() {
    return await this.toast.getHeaderTitle();
  }

  async getMessageText() {
    return await this.toast.getBody();
  }

  async closeAll() {
    await this.waitFor();
    await this.toast.closeAllToasts();
  }

  /**
   * Number of toasts currently visible. Returns `0` when none are present
   * (no implicit wait, unlike {@link waitFor}). Mirrors FTR
   * `toasts.getCount()`.
   */
  async getCount(): Promise<number> {
    return this.toast.getCount();
  }

  /**
   * The visible text of every toast currently displayed, in DOM order.
   * Mirrors FTR `toasts.getAll()` which returns toast element wrappers;
   * Scout returns the (already-extracted) text since no caller of
   * `getAll()` reads anything other than the body text.
   */
  async getAllText(): Promise<string[]> {
    const wrappers = await this.toast.getWrapper().all();
    const texts = await Promise.all(
      wrappers.map(async (wrapper) => {
        // Use scoped EUI selectors so the screen-reader-only "A new
        // notification appears" announcement (a sibling of `.euiToast`)
        // and the close-button glyph are excluded. Join title + body
        // paragraphs with `\n` to mirror FTR `getVisibleText()`.
        const title =
          (await wrapper.getByTestId('euiToastHeader__title').textContent())?.trim() ?? '';
        const body = ((await wrapper.getByTestId('euiToastBody').textContent()) ?? '').trim();
        return [title, body].filter(Boolean).join('\n');
      })
    );
    return texts;
  }

  /**
   * Close every visible toast without first waiting for one to appear.
   * Mirrors FTR `toasts.dismissAll()` and is the right helper when the
   * caller wants a known-clean toast region before triggering an action,
   * or when zero toasts is a valid post-condition.
   */
  async dismissAll(): Promise<void> {
    await this.toast.closeAllToasts();
  }
}
