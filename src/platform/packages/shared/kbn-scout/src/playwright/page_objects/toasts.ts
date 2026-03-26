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
}
