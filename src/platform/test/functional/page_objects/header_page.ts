/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';

export class HeaderPageObject extends FtrService {
  private readonly config = this.ctx.getService('config');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly appsMenu = this.ctx.getService('appsMenu');
  private readonly common = this.ctx.getPageObject('common');

  private readonly defaultFindTimeout = this.config.get('timeouts.find');

  public async clickDiscover(ignoreAppLeaveWarning = false) {
    await this.appsMenu.clickLink('Discover', { category: 'kibana' });
    await this.onAppLeaveWarning(ignoreAppLeaveWarning);
    await this.common.waitForTopNavToBeVisible();
    await this.awaitGlobalLoadingIndicatorHidden();
  }

  public async clickVisualize(ignoreAppLeaveWarning = false) {
    await this.appsMenu.clickLink('Visualize Library', { category: 'kibana' });
    await this.onAppLeaveWarning(ignoreAppLeaveWarning);
    await this.awaitGlobalLoadingIndicatorHidden();
    await this.retry.waitFor('Visualize app to be loaded', async () => {
      const isNavVisible = await this.testSubjects.exists('top-nav');
      return isNavVisible;
    });
  }

  public async clickDashboard() {
    await this.appsMenu.clickLink('Dashboard', { category: 'kibana' });
    await this.retry.waitFor('dashboard app to be loaded', async () => {
      const isNavVisible = await this.testSubjects.exists('top-nav');
      const isLandingPageVisible = await this.testSubjects.exists('dashboardLandingPage');
      return isNavVisible || isLandingPageVisible;
    });
    await this.awaitGlobalLoadingIndicatorHidden();
  }

  public async clickStackManagement() {
    await this.appsMenu.clickLink('Stack Management', { category: 'management' });
    await this.awaitGlobalLoadingIndicatorHidden();
  }

  public async waitUntilLoadingHasFinished() {
    try {
      await this.isGlobalLoadingIndicatorVisible();
    } catch (exception) {
      if (exception.name === 'ElementNotVisible') {
        // selenium might just have been too slow to catch it
      } else {
        throw exception;
      }
    }
    await this.awaitGlobalLoadingIndicatorHidden();
  }

  public async isGlobalLoadingIndicatorVisible() {
    this.log.debug('isGlobalLoadingIndicatorVisible');
    return await this.testSubjects.exists('globalLoadingIndicator', { timeout: 1500 });
  }

  public async awaitGlobalLoadingIndicatorHidden() {
    await this.testSubjects.existOrFail('globalLoadingIndicator-hidden', {
      allowHidden: true,
      timeout: this.defaultFindTimeout * 10,
    });
  }

  public async awaitKibanaChrome() {
    this.log.debug('awaitKibanaChrome');
    await this.testSubjects.find('kibanaChrome', this.defaultFindTimeout * 10);
  }

  public async onAppLeaveWarning(ignoreWarning = false) {
    await this.retry.try(async () => {
      const warning = await this.testSubjects.exists('confirmModalTitleText');
      if (warning) {
        await this.testSubjects.click(
          ignoreWarning ? 'confirmModalConfirmButton' : 'confirmModalCancelButton'
        );
      }
    });
  }
}
