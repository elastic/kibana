/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { FtrService } from '../ftr_provider_context';

export class NewsfeedPageObject extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly common = this.ctx.getPageObject('common');

  async sleep(sleepMilliseconds: number) {
    await setTimeoutAsync(sleepMilliseconds);
  }

  async resetPage() {
    await this.common.navigateToApp('home');
  }

  async closeNewsfeedPanel() {
    this.log.debug('closeNewsfeedPanel');
    await this.retry.waitFor('newsfeed sidebar to close', async () => {
      if (await this.testSubjects.exists('newsfeedSidebar')) {
        await this.testSubjects.click('sidebarHeaderCloseButton');
        return false;
      }
      return true;
    });
  }

  async isNewsfeedPanelOpen() {
    this.log.debug('isNewsfeedPanelOpen');
    return await this.testSubjects.exists('newsfeedSidebar');
  }

  async getRedButtonSign() {
    return await this.testSubjects.exists('headerActionButtonNotification', { timeout: 0 });
  }

  async getNewsfeedList() {
    const sidebar = await this.testSubjects.find('newsfeedSidebar');
    const cells = await sidebar.findAllByTestSubject('newsHeadAlert');

    const objects = [];
    for (const cell of cells) {
      objects.push(await cell.getVisibleText());
    }

    return objects;
  }

  async openNewsfeedEmptyPanel() {
    return await this.testSubjects.exists('emptyNewsfeed');
  }
}
