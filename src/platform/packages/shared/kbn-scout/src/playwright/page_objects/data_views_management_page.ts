/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from 'playwright/test';
import type { ScoutPage } from '..';

export class DataViewsManagementPage {
  public readonly createButton: Locator;
  public readonly headerBadge: Locator;
  public readonly table: Locator;

  constructor(private readonly page: ScoutPage) {
    this.createButton = this.page.testSubj.locator('createDataViewButton');
    this.headerBadge = this.page.testSubj.locator('headerBadge');
    this.table = this.page.testSubj.locator('indexPatternTable');
  }

  /** Navigates to the data views management page and waits for it to be ready. */
  async goto(): Promise<void> {
    await this.page.gotoApp('management/kibana/dataViews');
    await this.createButton.waitFor({ state: 'visible' });
  }

  /** Clicks the create button and waits for the editor flyout to open. */
  async openCreateWizard(): Promise<void> {
    await this.createButton.click();
    await this.page.testSubj.locator('indexPatternEditorFlyout').waitFor({ state: 'visible' });
  }

  /** Waits for the empty-state prompt (no data views exist). */
  async waitForEmptyListingPage() {
    await this.page.testSubj
      .locator('noDataViewsPrompt')
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  /** Waits for the data views table to appear (at least one data view exists). */
  async waitForNonEmptyListingPage() {
    await this.table.waitFor({ state: 'visible', timeout: 30_000 });
  }

  /** Waits for the data views table to appear (at least one data view exists). */
  async waitForTableLoaded() {
    await this.waitForNonEmptyListingPage();
  }

  async openDataViewDetails(title: string): Promise<void> {
    await this.waitForNonEmptyListingPage();
    await this.page.testSubj.click(`detail-link-${title}`);
    await this.page.testSubj.locator('indexPatternTitle').waitFor({ state: 'visible' });
  }

  fieldsTabCountLocator(): Locator {
    return this.page.testSubj.locator('tab-indexedFields');
  }

  /**
   * Returns the locator for a space avatar inside the data views table.
   * Scoping to the table avoids matching the Kibana nav header avatar.
   */
  spaceAvatarInTable(spaceId: string): Locator {
    return this.table.locator(`[data-test-subj="space-avatar-${spaceId}"]`);
  }

  /**
   * Clicks the space avatar for the given space in the data views table to open the
   * "Share to space" flyout, then waits for the flyout to be visible before returning.
   */
  async openShareToSpaceFlyout(spaceId: string): Promise<void> {
    await this.spaceAvatarInTable(spaceId).click();
    await this.page.testSubj.locator('share-to-space-flyout').waitFor({ state: 'visible' });
  }

  /** Selects a space by ID in the open "Share to space" flyout. */
  async selectSpaceInFlyout(spaceId: string) {
    await this.page.testSubj.click(`sts-space-selector-row-${spaceId}`);
  }

  /** Saves the "Share to space" flyout and waits for it to close. */
  async saveShareToSpaceFlyout() {
    await this.page.testSubj.click('sts-save-button');
    await this.page.testSubj.locator('share-to-space-flyout').waitFor({ state: 'hidden' });
  }
}
