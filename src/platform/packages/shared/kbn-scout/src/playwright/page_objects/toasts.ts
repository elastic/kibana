/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiGlobalToastListObject } from '../eui_components';
import type { ScoutPage } from '../fixtures/scope/test';

export class Toasts {
  private readonly toastList: EuiGlobalToastListObject;
  constructor(page: ScoutPage) {
    this.toastList = new EuiGlobalToastListObject(page);
  }

  /** Waits up to 10s for a toast to appear; throws when none does. */
  async waitFor() {
    await this.toastList.toasts.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * The title of the toast. Strict: throws when several toasts with a title
   * are shown at once.
   */
  async getHeaderText() {
    return (await this.toastList.toasts.getByTestId('euiToastHeader__title').textContent()) ?? '';
  }

  /**
   * The body text of the toast, or an empty string for a title-only toast.
   * Strict: throws when several toasts with a body are shown at once.
   */
  async getMessageText() {
    const text = this.toastList.toasts.getByTestId('euiToastText');
    if ((await text.count()) === 0) return '';
    return (await text.textContent()) ?? '';
  }

  /**
   * Waits for a toast to appear (throws when none does), then closes every
   * toast. Use `page.components.globalToastList().closeAll()` directly to
   * dismiss toasts only if present.
   */
  async closeAll() {
    await this.waitFor();
    await this.toastList.closeAll();
  }
}
