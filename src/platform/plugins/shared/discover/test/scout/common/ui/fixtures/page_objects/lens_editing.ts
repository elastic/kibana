/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

/** Lens steps used by Discover tests that send an inline view to Lens and come back. */
export class LensEditing {
  constructor(private readonly page: ScoutPage) {}

  /** Renames the selected data view through the picker editor. */
  async editCurrentDataViewName(name: string) {
    await this.page.testSubj.click('lns-dataView-switch-link');
    await this.page.testSubj.click('indexPattern-manage-field');
    const flyout = this.page.testSubj.locator('indexPatternEditorFlyout');
    await flyout.waitFor({ state: 'visible' });
    await this.page.testSubj.fill('createIndexPatternNameInput', name);
    await this.page.testSubj.click('saveIndexPatternButton');
    await flyout.waitFor({ state: 'hidden' });
  }

  /** Confirms leaving Lens without saving after navigation opens the leave prompt. */
  async confirmLeaveWithoutSaving() {
    const modal = this.page.testSubj.locator('appLeaveConfirmModal');
    await modal.getByTestId('confirmModalConfirmButton').click();
    await modal.waitFor({ state: 'hidden' });
  }
}
