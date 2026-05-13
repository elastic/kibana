/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';

export class OverlaysPage {
  constructor(private readonly page: ScoutPage) {}

  public get docViewerFlyout() {
    return this.page.testSubj.locator('docViewerFlyout');
  }

  public get newsfeedButton() {
    return this.page.testSubj.locator('^newsfeed');
  }

  public get newsfeedFlyout() {
    return this.page.testSubj.locator('NewsfeedFlyout');
  }

  public get newsfeedFlyoutCloseButton() {
    return this.page.testSubj
      .locator('NewsfeedFlyout')
      .locator('[data-test-subj="euiFlyoutCloseButton"]');
  }

  public async openNewsfeedFlyout() {
    await this.newsfeedButton.click();
    await this.newsfeedFlyout.waitFor({ state: 'visible' });
  }

  public async closeNewsfeedFlyout() {
    await this.newsfeedFlyoutCloseButton.click();
    await this.newsfeedFlyout.waitFor({ state: 'hidden' });
  }
}
