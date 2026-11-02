/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '../..';
import { DEFAULT_SAVE_MODAL_TIMEOUT, type TimeoutOptions } from './base';
import { DiscoverNavigation } from './navigation';

/** Save and load actions for the Discover facade. */
export abstract class DiscoverSave extends DiscoverNavigation {
  /** `protected` so `DiscoverPage` in `discover/test/scout` can reuse this for additional save flows. */
  protected async confirmSaveModal(options?: TimeoutOptions) {
    const saveModal = this.page.testSubj.locator('savedObjectSaveModal');
    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await expect(saveModal).toBeHidden({
      timeout: options?.timeout ?? DEFAULT_SAVE_MODAL_TIMEOUT,
    });
  }

  async loadSavedSearch(searchName: string) {
    await this.clickAppMenuItem('discoverOpenButton');
    await this.page.testSubj.waitForSelector('loadSearchForm', { state: 'visible' });
    const searchInput = this.page.testSubj.locator('savedObjectFinderSearchInput');
    await searchInput.fill(`"${searchName.replace('-', ' ')}"`);
    const savedSearchId = searchName.split(' ').join('-');
    await this.page.testSubj.click(`savedObjectTitle${savedSearchId}`);
    await this.waitUntilSearchingHasFinished();
  }

  async saveSearchAsNew(name: string) {
    await this.clickAppMenuItem('discoverSaveButton');
    await this.page.testSubj.fill('savedObjectTitle', name);
    const checkbox = this.page.testSubj.locator('saveAsNewCheckbox');
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
    }
    await this.confirmSaveModal();
  }
}
