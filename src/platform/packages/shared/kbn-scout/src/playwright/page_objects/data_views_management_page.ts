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

  /** Navigates straight to a data view's detail page by id and waits for it to be ready. */
  async gotoDataViewById(id: string): Promise<void> {
    await this.page.gotoApp(`management/kibana/dataViews/dataView/${id}`);
    await this.page.testSubj.locator('editIndexPatternButton').waitFor({ state: 'visible' });
  }

  /** Opens the edit flyout for the currently open data view. */
  async openEditor(): Promise<void> {
    await this.page.testSubj.click('editIndexPatternButton');
    await this.page.testSubj.locator('indexPatternEditorFlyout').waitFor({ state: 'visible' });
  }

  /**
   * Edits the currently open data view via the edit flyout. Changing the index pattern (title)
   * of a saved data view surfaces a confirmation modal, which is accepted automatically; editing
   * only the display name saves directly. Returns whether the modal was shown.
   */
  async editDataView({
    title,
    name,
  }: {
    title?: string;
    name?: string;
  }): Promise<{ confirmed: boolean }> {
    await this.openEditor();

    if (name !== undefined) {
      await this.page.testSubj.fill('createIndexPatternNameInput', name);
    }
    if (title !== undefined) {
      await this.page.testSubj.fill('createIndexPatternTitleInput', title);
      // Wait for async title validation to settle so the save button becomes enabled.
      await this.page.testSubj
        .locator('indexPatternEditorForm')
        .and(this.page.locator('[data-validation-error="0"]'))
        .waitFor({ state: 'visible' });
    }

    await this.page.testSubj.click('saveIndexPatternButton');

    // The confirmation modal (shown only when the index pattern changes) renders client-side
    // right after saving, so a short wait reliably distinguishes "modal" from "no modal".
    const confirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
    const confirmed = await confirmButton
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (confirmed) {
      await confirmButton.click();
    }

    await this.page.testSubj.locator('indexPatternEditorFlyout').waitFor({ state: 'hidden' });
    return { confirmed };
  }

  /** Deletes the currently open data view through the "more actions" menu and delete flyout. */
  async deleteDataView(): Promise<void> {
    await this.page.testSubj.click('moreActionsButton');
    await this.page.testSubj.click('deleteIndexPatternButton');
    await this.page.testSubj.locator('deleteDataViewFlyoutHeader').waitFor({ state: 'visible' });
    await this.page.testSubj.click('confirmFlyoutConfirmButton');
  }

  fieldsTabCountLocator(): Locator {
    return this.page.testSubj.locator('tab-indexedFields');
  }

  /** Header cell of the indexed-fields table on the data view detail page. */
  fieldsTableHeader(field: string, index: number): Locator {
    return this.page.testSubj.locator(`tableHeaderCell_${field}_${index}`);
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
