/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';

const APP_MENU_OVERFLOW_BUTTON = 'app-menu-overflow-button';
const APP_MENU_POPOVER = 'app-menu-popover';

export class AppMenuPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');

  private async ensureOverflowPopoverClosed() {
    if (await this.testSubjects.exists(APP_MENU_POPOVER, { timeout: 500 })) {
      await this.testSubjects.click(APP_MENU_OVERFLOW_BUTTON);
      await this.testSubjects.missingOrFail(APP_MENU_POPOVER, { timeout: 2000 });
    }
  }

  async clickMenuItem(testId: string, { isInOverflowMenu }: { isInOverflowMenu?: boolean } = {}) {
    await this.retry.try(async () => {
      if (!isInOverflowMenu && (await this.testSubjects.exists(testId, { timeout: 1000 }))) {
        await this.testSubjects.click(testId);
        return;
      }

      // Close popover if left open from a previous attempt to avoid toggle issues
      await this.ensureOverflowPopoverClosed();

      await this.testSubjects.existOrFail(APP_MENU_OVERFLOW_BUTTON);
      await this.testSubjects.click(APP_MENU_OVERFLOW_BUTTON);

      // Verify the popover actually opened
      await this.testSubjects.existOrFail(APP_MENU_POPOVER, { timeout: 3000 });
      await this.testSubjects.existOrFail(testId, { timeout: 5000 });
      await this.testSubjects.click(testId);
    });
  }

  async menuItemExists(testId: string) {
    if (await this.testSubjects.exists(testId)) {
      return true;
    }

    if (await this.testSubjects.exists(APP_MENU_OVERFLOW_BUTTON)) {
      await this.testSubjects.click(APP_MENU_OVERFLOW_BUTTON);
      const exists = await this.testSubjects.exists(testId);
      await this.testSubjects.click(APP_MENU_OVERFLOW_BUTTON);
      return exists;
    }

    return false;
  }

  async existOrFail(testId: string) {
    if (await this.testSubjects.exists(testId)) {
      return;
    }

    if (await this.testSubjects.exists(APP_MENU_OVERFLOW_BUTTON)) {
      await this.testSubjects.click(APP_MENU_OVERFLOW_BUTTON);
      const exists = await this.testSubjects.exists(testId);
      await this.testSubjects.click(APP_MENU_OVERFLOW_BUTTON);
      if (exists) {
        return;
      }
    }

    await this.testSubjects.existOrFail(testId);
  }
}
