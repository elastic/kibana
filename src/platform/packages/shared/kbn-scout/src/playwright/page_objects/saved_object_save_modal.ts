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
  private readonly descriptionInput;
  private readonly confirmSaveButton;
  private readonly dashboardPicker;
  private readonly newDashboardRadio;
  private readonly addToLibraryCheckbox;
  private readonly tagSelector;
  private readonly tagForm;
  private readonly tagColorInput;
  private readonly tagSaturationPopover;

  constructor(private readonly page: ScoutPage) {
    this.modal = this.page.testSubj.locator('savedObjectSaveModal');
    this.titleInput = this.page.testSubj.locator('savedObjectTitle');
    this.descriptionInput = this.page.testSubj.locator('savedObjectDescription');
    this.confirmSaveButton = this.page.testSubj.locator('confirmSaveSavedObjectButton');
    this.dashboardPicker = this.page.testSubj.locator('open-dashboard-picker');
    this.newDashboardRadio = this.page.locator('input#new-dashboard-option');
    this.addToLibraryCheckbox = this.page.locator('input#add-to-library-checkbox');
    this.tagSelector = this.page.testSubj.locator('savedObjectTagSelector');
    this.tagForm = this.page.testSubj.locator('tagModalForm');
    this.tagColorInput = this.page.testSubj.locator('~createModalField-color');
    this.tagSaturationPopover = this.page.testSubj.locator('euiSaturation');
  }

  async fillTitle(name: string) {
    await this.titleInput.fill(name);
  }

  async fillDescription(description: string) {
    await this.descriptionInput.fill(description);
  }

  /**
   * Opens the tag selector's "Create a new tag" option and fills/submits the tag-creation
   * form. The color field opens a saturation-picker popover on click; pressing Enter commits
   * the typed hex value and closes it so it doesn't intercept later clicks (e.g. the confirm
   * button below the description field).
   */
  async createAndSelectTag(fields: { name: string; color: string; description?: string }) {
    await this.tagSelector.click();
    await this.page.testSubj.click('tagSelectorOption-action__create');
    await this.tagForm.waitFor({ state: 'visible' });

    await this.page.testSubj.locator('createModalField-name').fill(fields.name);

    await this.tagColorInput.click();
    await this.tagColorInput.fill(fields.color);
    await this.tagSaturationPopover.waitFor({ state: 'visible' });
    await this.page.keyboard.press('Enter');
    await this.tagSaturationPopover.waitFor({ state: 'hidden' });

    if (fields.description !== undefined) {
      await this.page.testSubj.locator('createModalField-description').fill(fields.description);
    }

    await this.page.testSubj.click('createModalConfirmButton');
    await this.tagForm.waitFor({ state: 'hidden' });
  }

  async selectExistingDashboard(dashboardTitle: string) {
    await this.page.locator('label[for="existing-dashboard-option"]').click();
    await this.dashboardPicker.click();
    await this.page.testSubj
      .locator(`dashboard-picker-option-${dashboardTitle.split(' ').join('-')}`)
      .click();
  }

  async selectNewDashboard() {
    // `check` auto-waits for enabled; the radio can start disabled (e.g. re-saving an
    // existing saved object until "Save as new" is toggled).
    await this.newDashboardRadio.check();
  }

  /**
   * Sets the "Add to library" checkbox shown with the add-to-dashboard options; unchecking
   * it saves the object as a by-value panel instead of a library reference.
   */
  async setAddToLibrary(checked: boolean) {
    await this.addToLibraryCheckbox.setChecked(checked);
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
    await expect(this.addToLibraryCheckbox).toBeChecked();
    await expect(this.addToLibraryCheckbox).toBeDisabled();
    await this.confirm();
  }
}
