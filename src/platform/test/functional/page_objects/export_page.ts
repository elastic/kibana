/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';

export class ExportPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');

  async exportButtonExists() {
    return await this.testSubjects.exists('exportTopNavButton');
  }

  async exportButtonMissingOrFail() {
    await this.testSubjects.missingOrFail('exportTopNavButton', { timeout: 1000 });
  }

  async clickExportTopNavButton(): Promise<boolean> {
    if (await this.isExportPopoverOpen()) {
      return true;
    }

    // The export action renders either in the top nav or inside the app menu overflow. The
    // overflow button can also render next to a visible export button, so list export first.
    const entry = await this.testSubjects.waitForFirst(
      ['exportTopNavButton', 'app-menu-overflow-button'],
      { timeout: 5000 }
    );
    if (!entry) {
      return false;
    }

    if (entry === 'app-menu-overflow-button') {
      await this.testSubjects.click('app-menu-overflow-button');
      const overflowEntry = await this.testSubjects.waitForFirst(
        ['exportPopoverPanel', 'exportTopNavButton'],
        { timeout: 5000 }
      );
      if (!overflowEntry) {
        return false;
      }
      if (overflowEntry === 'exportPopoverPanel') {
        return true;
      }
    }

    try {
      await this.testSubjects.click('exportTopNavButton');
    } catch (error) {
      // In responsive layouts, the action can move into the overflow menu between the readiness
      // probe and click. Its open export panel is the successful state for this helper.
      if (!(await this.isExportPopoverOpen())) {
        throw error;
      }
    }
    return true;
  }

  async isExportPopoverOpen() {
    return await this.testSubjects.exists('exportPopoverPanel');
  }

  async isPopoverItemEnabled(label: string) {
    let isEnabled;
    if (!(isEnabled = await this.testSubjects.isEnabled(`exportMenuItem-${label}`))) {
      this.log.debug(`isPopoverItemEnabled: ${label} is not enabled`);
    }
    return isEnabled;
  }

  async clickPopoverItem(
    label: string,
    exportPopoverOpener: () => Promise<boolean> = this.clickExportTopNavButton.bind(this)
  ) {
    this.log.debug(`clickPopoverItem label: ${label}`);

    await this.retry.waitFor('ascertain that export popover is open', async () => {
      let isExportPopoverOpen = await this.isExportPopoverOpen();

      if (!isExportPopoverOpen) {
        await exportPopoverOpener();
        isExportPopoverOpen = await this.isExportPopoverOpen();
      }

      return isExportPopoverOpen;
    });

    await this.testSubjects.click(`exportMenuItem-${label}`);
  }

  async closeExportPopover() {
    await this.retry.waitFor('export popover to close', async () => {
      if (!(await this.isExportPopoverOpen())) {
        return true; // It was already closed
      }
      await this.browser.pressKeys(this.browser.keys.ESCAPE);
      return !(await this.isExportPopoverOpen());
    });
  }

  async isExportFlyoutOpen() {
    return await this.testSubjects.exists('exportItemDetailsFlyout');
  }

  async closeExportFlyout() {
    const closeButtonSubj = 'exportFlyoutCloseButton';
    await this.retry.waitFor('flyout to close', async () => {
      const isExportFlyoutOpen = await this.testSubjects.exists(closeButtonSubj);

      if (!isExportFlyoutOpen) {
        return true; // It was already closed
      }

      // Use clickWhenNotDisabledWithoutRetry to avoid the internal retry mechanism
      await this.testSubjects.clickWhenNotDisabledWithoutRetry(closeButtonSubj);
      await this.testSubjects.waitForDeleted(closeButtonSubj);
      return true;
    });
  }

  async getExportAssetTextButton() {
    return await this.find.byCssSelector(
      '[data-test-subj="exportItemDetailsFlyout"] [data-test-subj="euiCodeBlockCopy"]'
    );
  }

  async copyExportAssetText() {
    await (await this.getExportAssetTextButton()).click();
  }
}
