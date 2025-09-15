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

  async exportButtonExists() {
    return await this.testSubjects.exists('exportTopNavButton');
  }

  async clickExportTopNavButton() {
    return this.testSubjects.click('exportTopNavButton');
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
    exportPopoverOpener: () => Promise<void> = this.clickExportTopNavButton.bind(this)
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

  async isExportFlyoutOpen() {
    return await this.testSubjects.exists('exportItemDetailsFlyout');
  }

  async closeExportFlyout() {
    if (await this.isExportFlyoutOpen()) {
      await this.testSubjects.click('exportFlyoutCloseButton');
    }
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
