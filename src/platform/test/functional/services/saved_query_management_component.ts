/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class SavedQueryManagementComponentService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly queryBar = this.ctx.getService('queryBar');
  private readonly retry = this.ctx.getService('retry');
  private readonly config = this.ctx.getService('config');
  private readonly common = this.ctx.getPageObject('common');
  private readonly browser = this.ctx.getService('browser');

  private async clickMenuButtonByTestSubject(testSubj: string) {
    const cssSelector = this.testSubjects.getCssSelector(testSubj);
    await this.retry.try(async () => {
      await this.closeSavedQueryManagementComponent();
      await this.openSavedQueryManagementComponent();
      const clicked = await this.browser.execute((sel: string) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) return false;
        el.click();
        return true;
      }, cssSelector);
      if (!clicked) {
        throw new Error(`Menu button '${testSubj}' not found`);
      }
    });
  }

  public async getCurrentlyLoadedQueryID() {
    await this.openSavedQueryManagementComponent();
    try {
      let text = '';
      await this.retry.try(async () => {
        text = await this.testSubjects.getVisibleText('savedQueryTitle');
        if (!text) {
          throw new Error('Saved query title not yet rendered');
        }
      });
      return text;
    } catch {
      return undefined;
    }
  }

  public async saveNewQuery(
    name: string,
    description: string,
    includeFilters: boolean,
    includeTimeFilter: boolean
  ) {
    await this.openSaveCurrentQueryModal();
    await this.submitSaveQueryForm(name, description, includeFilters, includeTimeFilter);
  }

  public async saveNewQueryWithNameError(name?: string) {
    await this.openSaveCurrentQueryModal();
    if (name) {
      await this.testSubjects.setValue('saveQueryFormTitle', name);
    }

    // Form input validation only happens onBlur. Clicking the save button should de-focus the
    // input element and the validation should prevent a save from actually happening if there's
    // an error.
    await this.testSubjects.click('savedQueryFormSaveButton');

    await this.retry.waitForWithTimeout('save button to be disabled', 1000, async () => {
      const saveQueryFormSaveButtonStatus = await this.testSubjects.isEnabled(
        'savedQueryFormSaveButton'
      );
      return saveQueryFormSaveButtonStatus === false;
    });

    const contextMenuPanelTitleButton = await this.testSubjects.exists(
      'contextMenuPanelTitleButton'
    );
    if (contextMenuPanelTitleButton) {
      await this.testSubjects.click('contextMenuPanelTitleButton');
    }
  }

  public async saveCurrentlyLoadedAsNewQuery(
    name: string,
    description: string,
    includeFilters: boolean,
    includeTimeFilter: boolean
  ) {
    await this.openSavedQueryManagementComponent();
    await this.testSubjects.click('saved-query-management-save-button');
    await this.submitSaveQueryForm(name, description, includeFilters, includeTimeFilter);
  }

  public async updateCurrentlyLoadedQuery(
    description: string,
    includeFilters: boolean,
    includeTimeFilter: boolean
  ) {
    await this.openSavedQueryManagementComponent();
    await this.testSubjects.click('saved-query-management-save-changes-button');
    await this.submitSaveQueryForm(null, description, includeFilters, includeTimeFilter);
  }

  public async loadSavedQuery(title: string) {
    await this.clickMenuButtonByTestSubject('saved-query-management-load-button');
    await this.testSubjects.click(`~load-saved-query-${title}-button`);
    await this.testSubjects.click('saved-query-management-apply-changes-button');
    await this.retry.try(async () => {
      await this.testSubjects.missingOrFail('queryBarMenuPanel');
    });
    await this.retry.try(async () => {
      await this.openSavedQueryManagementComponent();
      const selectedSavedQueryText = await this.testSubjects.getVisibleText('savedQueryTitle');
      expect(selectedSavedQueryText).to.eql(title);
    });
    await this.closeSavedQueryManagementComponent();
  }

  public async deleteSavedQuery(title: string) {
    await this.clickMenuButtonByTestSubject('saved-query-management-load-button');
    await this.testSubjects.click(`~load-saved-query-${title}-button`);
    await this.retry.waitFor('delete saved query', async () => {
      await this.testSubjects.click(`delete-saved-query-button`);
      const exists = await this.testSubjects.exists('confirmModalTitleText');
      return exists === true;
    });
    await this.common.clickConfirmOnModal();
  }

  async clearCurrentlyLoadedQuery() {
    await this.openSavedQueryManagementComponent();
    await this.testSubjects.click('filter-sets-removeAllFilters');
    await this.closeSavedQueryManagementComponent();
    const queryString = await this.queryBar.getQueryString();
    expect(queryString).to.be.empty();
  }

  async submitSaveQueryForm(
    title: string | null,
    description: string,
    includeFilters: boolean,
    includeTimeFilter: boolean
  ) {
    if (title) {
      await this.testSubjects.setValue('saveQueryFormTitle', title);
    }

    const currentIncludeFiltersValue =
      (await this.testSubjects.getAttribute(
        'saveQueryFormIncludeFiltersOption',
        'aria-checked'
      )) === 'true';
    if (currentIncludeFiltersValue !== includeFilters) {
      await this.testSubjects.click('saveQueryFormIncludeFiltersOption');
    }

    const currentIncludeTimeFilterValue =
      (await this.testSubjects.getAttribute(
        'saveQueryFormIncludeTimeFilterOption',
        'aria-checked'
      )) === 'true';
    if (currentIncludeTimeFilterValue !== includeTimeFilter) {
      await this.testSubjects.click('saveQueryFormIncludeTimeFilterOption');
    }

    await this.testSubjects.click('savedQueryFormSaveButton');
    await this.retry.try(async () => {
      await this.testSubjects.missingOrFail('saveQueryForm');
    });
  }

  async savedQueryExist(title: string) {
    await this.clickMenuButtonByTestSubject('saved-query-management-load-button');
    const exists = await this.testSubjects.exists(`~load-saved-query-${title}-button`);
    await this.closeSavedQueryManagementComponent();
    return exists;
  }

  async savedQueryExistOrFail(title: string) {
    await this.clickMenuButtonByTestSubject('saved-query-management-load-button');
    await this.testSubjects.existOrFail(`~load-saved-query-${title}-button`);
  }

  async savedQueryTextExist(text: string) {
    await this.openSavedQueryManagementComponent();
    const queryString = await this.queryBar.getQueryString();
    expect(queryString).to.eql(text);
  }

  async savedQueryMissingOrFail(title: string) {
    await this.retry.try(async () => {
      await this.openSavedQueryManagementComponent();
      await this.testSubjects.missingOrFail(`~load-saved-query-${title}-button`);
    });
    await this.closeSavedQueryManagementComponent();
  }

  async savedQueryLoadButtonMissingOrFail() {
    await this.retry.try(async () => {
      await this.openSavedQueryManagementComponent();
      await this.testSubjects.missingOrFail('saved-query-management-load-button');
    });
    await this.closeSavedQueryManagementComponent();
  }

  async openSavedQueryManagementComponent() {
    await this.retry.try(async () => {
      if (!(await this.testSubjects.exists('queryBarMenuPanel', { timeout: 1000 }))) {
        await this.testSubjects.click('showQueryBarMenu');
      }
      await this.testSubjects.existOrFail('queryBarMenuPanel');
    });
  }

  async closeSavedQueryManagementComponent() {
    const isOpenAlready = await this.testSubjects.exists('queryBarMenuPanel');
    if (!isOpenAlready) return;

    await this.retry.try(async () => {
      await this.testSubjects.click('showQueryBarMenu');
      await this.testSubjects.missingOrFail('queryBarMenuPanel');
    });
  }

  async openSaveCurrentQueryModal() {
    await this.openSavedQueryManagementComponent();

    await this.retry.try(async () => {
      await this.testSubjects.click('saved-query-management-save-button');
      await this.testSubjects.existOrFail('saveQueryForm', {
        timeout: this.config.get('timeouts.waitForExists'),
      });
    });
  }

  async saveNewQueryMissingOrFail(expectedButtonState: 'disabled' | 'hidden' = 'disabled') {
    await this.openSavedQueryManagementComponent();

    if (expectedButtonState === 'disabled') {
      const saveFilterSetBtn = await this.testSubjects.find('saved-query-management-save-button');
      const isDisabled = await saveFilterSetBtn.getAttribute('disabled');
      expect(isDisabled).to.equal('true');
    } else {
      await this.testSubjects.missingOrFail('saved-query-management-save-button');
    }
  }

  async updateCurrentlyLoadedQueryMissingOrFail() {
    await this.openSavedQueryManagementComponent();
    await this.testSubjects.missingOrFail('saved-query-management-save-changes-button');
  }

  async deleteSavedQueryMissingOrFail(title: string) {
    await this.openSavedQueryManagementComponent();
    await this.testSubjects.missingOrFail(`delete-saved-query-${title}-button`);
  }
}
