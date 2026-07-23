/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';
import { expect } from '..';

/**
 * Page object for the shared `SavedObjectSaveModal` (and its `SaveModalDashboardSelector`
 * add-to-dashboard controls), used when saving visualizations, maps, and other saved objects.
 * Assumes the modal is already open; each app opens it differently (e.g. Visualize's
 * `visualizeSaveButton`, Maps' `saveButton`).
 */
export class SavedObjectSaveModal {
  /** The modal container itself, exposed so callers can wait for it to open (e.g. after clicking an app-specific save button). */
  readonly modal;
  private readonly titleInput;
  private readonly confirmSaveButton;
  private readonly dashboardPicker;

  constructor(private readonly page: ScoutPage) {
    this.modal = this.page.testSubj.locator('savedObjectSaveModal');
    this.titleInput = this.page.testSubj.locator('savedObjectTitle');
    this.confirmSaveButton = this.page.testSubj.locator('confirmSaveSavedObjectButton');
    this.dashboardPicker = this.page.testSubj.locator('open-dashboard-picker');
  }

  async fillTitle(name: string) {
    await this.titleInput.fill(name);
  }

  async selectExistingDashboard(dashboardTitle: string) {
    await this.page.locator('label[for="existing-dashboard-option"]').click();
    await this.dashboardPicker.click();
    await this.page.testSubj
      .locator(`dashboard-picker-option-${dashboardTitle.split(' ').join('-')}`)
      .click();
  }

  async selectNewDashboard() {
    await this.page.locator('label[for="new-dashboard-option"]').click();
  }

  async selectNoDashboard() {
    await this.page.locator('label[for="add-to-library-option"]').click();
  }

  async confirm() {
    await this.confirmSaveButton.click();
    await expect(this.modal).toBeHidden();
  }

  async saveToExistingDashboard(name: string, dashboardTitle: string) {
    await this.fillTitle(name);
    await this.selectExistingDashboard(dashboardTitle);
    await this.confirm();
  }

  async saveToNewDashboard(name: string) {
    await this.fillTitle(name);
    await this.selectNewDashboard();
    await this.confirm();
  }

  async saveToLibrary(name: string) {
    await this.fillTitle(name);
    await this.selectNoDashboard();
    const addToLibraryCheckbox = this.page.locator('input#add-to-library-checkbox');
    await expect(addToLibraryCheckbox).toBeChecked();
    await expect(addToLibraryCheckbox).toBeDisabled();
    await this.confirm();
  }
}
