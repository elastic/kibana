/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_SEARCH_SESSION_REST_VERSION } from '@kbn/data-plugin/server';
import expect from '@kbn/expect';
import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { SavedObjectsFindResponse } from '@kbn/core/server';
import { FtrService } from '../ftr_provider_context';

const APP_MENU_OVERFLOW_BUTTON = 'app-menu-overflow-button';
const BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT = 'openBackgroundSearchFlyoutButton';
const BACKGROUND_SEARCH_SUBMIT_BUTTON = 'querySubmitButton-secondary-button';
const BACKGROUND_SEARCH_CANCEL_BUTTON = 'queryCancelButton-secondary-button';

export class SearchSessionsService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly security = this.ctx.getService('security');
  private readonly toasts = this.ctx.getService('toasts');
  private readonly es = this.ctx.getService('es');

  public async find(): Promise<WebElementWrapper> {
    return this.testSubjects.find(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
  }

  public async exists(): Promise<boolean> {
    return this.testSubjects.exists(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
  }

  public async sendToBackgroundButtonExists(): Promise<boolean> {
    return this.testSubjects.exists(BACKGROUND_SEARCH_SUBMIT_BUTTON);
  }

  public async missingOrFail(): Promise<void> {
    return this.testSubjects.missingOrFail(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
  }

  public async disabledOrFail() {
    const isDisabled = await this.testSubjects.getAttribute(
      BACKGROUND_SEARCH_SUBMIT_BUTTON,
      'disabled'
    );
    expect(isDisabled).to.be('true');
  }

  public async save({
    // Dashboards don't put the split button in the loading state so the selector is different
    withRefresh = false,
    isSubmitButton = false,
  }: { searchSessionName?: string; isSubmitButton?: boolean; withRefresh?: boolean } = {}) {
    this.log.debug('save the search session');
    if (withRefresh) {
      await this.testSubjects.clickWhenNotDisabledWithoutRetry('querySubmitButton');
    }

    await this.testSubjects.clickWhenNotDisabledWithoutRetry(
      isSubmitButton ? BACKGROUND_SEARCH_SUBMIT_BUTTON : BACKGROUND_SEARCH_CANCEL_BUTTON
    );
    await this.expectSearchSavedToast();
  }

  public async expectSearchSavedToast() {
    await this.retry.waitFor(
      'the toast appears indicating that the search session is saved',
      async () => {
        const count = await this.toasts.getCount();
        return count > 0;
      }
    );
  }

  public async openCompletedSearchFromToast() {
    await this.retry.try(async () => {
      const link = await this.testSubjects.find('backgroundSearchCompletedToastLink');
      if (!link) throw new Error('Background search completed toast link not found');
      await link.click();
    });
    // After clicking the link, the toast is no longer needed
    await this.dismissSuccessToast();
  }

  private async dismissSuccessToast() {
    const successToast = await this.getSuccessToast();
    if (!successToast) return;
    const closeBtn = await successToast.findByTestSubject('toastCloseButton');
    await closeBtn.click();

    await this.retry.waitFor('success toast to be dismissed', async () => {
      const _successToast = await this.getSuccessToast();
      return !_successToast;
    });
  }

  private async getSuccessToast() {
    const toasts = await this.toasts.getAll();
    for (const toast of toasts) {
      const text = await toast.getVisibleText();
      if (text.includes('Background search completed')) {
        return toast;
      }
    }
    return null;
  }

  public async openFlyoutFromToast() {
    await this.expectSearchSavedToast();
    await this.testSubjects.click('backgroundSearchToastLink');
  }

  public async openFlyout() {
    await this.retry.try(async () => {
      // 1. The background search button is already visible so we are ready to go
      if (await this.testSubjects.exists(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT)) return;
      // 2. The button is not visible but the overflow menu is, so we can try to open it.
      if (await this.testSubjects.exists(APP_MENU_OVERFLOW_BUTTON)) {
        await this.testSubjects.click(APP_MENU_OVERFLOW_BUTTON);
        await this.testSubjects.existOrFail(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
        return;
      }
      // 3. Neither is visible so we fail to try again
      throw new Error('Background search button not found');
    });

    await this.testSubjects.click(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
    await this.expectManagementTable();
  }

  public async closeFlyout() {
    await this.testSubjects.click('euiFlyoutCloseButton');
    await this.testSubjects.missingOrFail('searchSessionsMgmtUiTable');
  }

  public async expectManagementTable() {
    await this.testSubjects.existOrFail('searchSessionsMgmtUiTable');
  }

  public async expectNoErrorsOrWarnings() {
    expect(await this.hasErrorsOrWarnings()).to.be(false);
  }

  private async hasErrorsOrWarnings() {
    const messages = [
      // Warnings
      'Your background search is still running',
      // Errors
      'Timed out',
      'Search Error',
      'Cannot retrieve search results',
      'Unable to connect to the Kibana server',
      'Failed to edit name of the background search',
      'Failed to fetch background search info',
    ];

    const toasts = await this.toasts.getAll();
    for (const toast of toasts) {
      const text = await toast.getVisibleText();
      if (messages.some((message) => text.includes(message))) {
        return true;
      }
    }
    return false;
  }

  /*
   * This cleanup function should be used by tests that create new search sessions.
   * Tests should not end with new search sessions remaining in storage since that interferes with functional tests that check the _find API.
   * Alternatively, a test can navigate to `Management > Search Sessions` and use the UI to delete any created tests.
   */
  public async deleteAllSearchSessions() {
    this.log.debug('Deleting created search sessions');
    // ignores 409 errs and keeps retrying
    await this.retry.tryForTime(10000, async () => {
      const { body } = await this.security.testUserSupertest
        .post('/internal/session/_find')
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_SEARCH_SESSION_REST_VERSION)
        .set('kbn-xsrf', 'anything')
        .set('kbn-system-request', 'true')
        .send({
          page: 1,
          perPage: 10000,
          sortField: 'created',
          sortOrder: 'asc',
        })
        .expect(200);

      const { saved_objects: savedObjects } = body as SavedObjectsFindResponse;

      if (savedObjects.length > 0) {
        this.log.debug(`Found created search sessions: ${savedObjects.map(({ id }) => id)}`);
      } else {
        this.log.debug(`Found no search sessions to delete`);
        return;
      }

      await Promise.all(
        savedObjects.map(async (so) => {
          this.log.debug(`Deleting search session: ${so.id}`);
          await this.security.testUserSupertest
            .delete(`/internal/session/${so.id}`)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_SEARCH_SESSION_REST_VERSION)
            .set(`kbn-xsrf`, `anything`)
            .expect(200);
        })
      );
    });
  }

  public async getAsyncSearchStatus(asyncSearchId: string) {
    const asyncSearchStatus = await this.es.asyncSearch.status({ id: asyncSearchId });
    return asyncSearchStatus;
  }

  public async getAsyncSearchExpirationTime(asyncSearchId: string): Promise<number> {
    const asyncSearchStatus = await this.getAsyncSearchStatus(asyncSearchId);
    return Number(asyncSearchStatus.expiration_time_in_millis);
  }
}
