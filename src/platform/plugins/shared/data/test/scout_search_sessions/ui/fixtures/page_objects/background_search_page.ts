/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * App menu item that opens the background search flyout. Exported so Discover specs can drive
 * it through `pageObjects.discover.clickAppMenuItem()`, which handles the item being collapsed
 * into the app menu overflow popover — which is where Discover puts it in both classic and
 * ES|QL mode.
 */
export const BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT = 'openBackgroundSearchFlyoutButton';

const SUBMIT_BUTTON = 'querySubmitButton';
const CANCEL_BUTTON = 'queryCancelButton';
// While a search is in flight the split button switches from `querySubmitButton-*` to
// `queryCancelButton-*`, and only then does it offer "Send to background".
const SEND_TO_BACKGROUND_BUTTON = 'queryCancelButton-secondary-button';
const MANAGEMENT_TABLE = 'searchSessionsMgmtUiTable';
const SAVED_TOAST_LINK = 'backgroundSearchToastLink';
const COMPLETED_TOAST_LINK = 'backgroundSearchCompletedToastLink';

/**
 * Toast copy that indicates a background search failed, timed out, or is still running.
 * Mirrors the message list of the FTR `searchSessions.hasErrorsOrWarnings()` service helper.
 */
const ERROR_OR_WARNING_PATTERN =
  /Your background search is still running|Timed out|Search Error|Cannot retrieve search results|Unable to connect to the Kibana server|Failed to edit name of the background search|Failed to fetch background search info/;

/**
 * Page object for the in-app background search controls: the "Send to background" secondary
 * submit button, the background search flyout, and the completion toast. These render inside
 * Discover and Dashboard.
 *
 * The standalone management application at /app/management/kibana/search_sessions is covered
 * by `BackgroundSearchManagementPage` instead.
 */
export class BackgroundSearchPage {
  public readonly managementTable: Locator;
  public readonly flyoutEntrypoint: Locator;
  public readonly completedToastLink: Locator;
  private readonly savedToastLink: Locator;

  constructor(private readonly page: ScoutPage) {
    this.managementTable = this.page.testSubj.locator(MANAGEMENT_TABLE);
    this.flyoutEntrypoint = this.page.testSubj.locator(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
    this.completedToastLink = this.page.testSubj.locator(COMPLETED_TOAST_LINK);
    this.savedToastLink = this.page.testSubj.locator(SAVED_TOAST_LINK);
  }

  /**
   * Toasts reporting that a background search failed, timed out, or is still running. Exposed
   * as a locator so specs assert on it with a retrying, web-first assertion rather than a
   * point-in-time boolean.
   */
  public get errorOrWarningToasts(): Locator {
    return this.page.components.toast().toasts.filter({ hasText: ERROR_OR_WARNING_PATTERN });
  }

  /**
   * Re-run the current query and send the resulting in-flight search to the background, then
   * wait for the confirmation toast.
   */
  async sendToBackground() {
    const submitButton = this.page.testSubj.locator(SUBMIT_BUTTON);
    // While a search is in flight the submit button is swapped for the cancel button, so wait
    // for it to come back before clicking.
    await submitButton.waitFor({ state: 'visible' });
    await submitButton.click();

    // Confirm the search is actually in flight before reaching for the secondary action.
    // Without this, a query that returns instantly makes the next click race a DOM swap and
    // fail with a confusing "element is not enabled / was detached" error.
    await this.page.testSubj.locator(CANCEL_BUTTON).waitFor({ state: 'visible' });

    await this.page.testSubj.locator(SEND_TO_BACKGROUND_BUTTON).click();
    await this.savedToastLink.waitFor({ state: 'visible' });
  }

  /** Wait for the flyout's background search table to render. */
  async waitForFlyout() {
    await this.managementTable.waitFor({ state: 'visible' });
  }
}
