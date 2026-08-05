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
import { SavedObjectSaveModal } from './saved_object_save_modal';

type VisType = 'lens' | 'vega' | 'metrics' | 'aggbased' | 'maps';

export class VisualizeApp {
  private readonly landingPage;
  private readonly newItemButton;
  private readonly visNewDialogGroups;
  private readonly visNewDialogTypes;
  private readonly legacyTab;
  private readonly visualizeSaveButton;
  private readonly visualizationLoader;
  private readonly editInLensButton;
  /** Save modal locators/actions, shared with other apps (e.g. Maps) via `SavedObjectSaveModal`. */
  readonly saveModal: SavedObjectSaveModal;

  constructor(private readonly page: ScoutPage) {
    this.landingPage = this.page.testSubj.locator('visualizationLandingPage');
    this.newItemButton = this.page.testSubj.locator('newItemButton');
    this.visNewDialogGroups = this.page.testSubj.locator('visNewDialogGroups');
    this.visNewDialogTypes = this.page.testSubj.locator('visNewDialogTypes');
    this.legacyTab = this.page.testSubj.locator('groupModalLegacyTab');
    this.visualizeSaveButton = this.page.testSubj.locator('visualizeSaveButton');
    this.visualizationLoader = this.page.testSubj.locator('visualizationLoader');
    this.editInLensButton = this.page.testSubj.locator('visualizeEditInLensButton');
    this.saveModal = new SavedObjectSaveModal(this.page);
  }

  async goto() {
    await this.page.gotoApp('visualize');
    await expect(this.landingPage).toBeVisible();
  }

  async openNewVisualizationWizard() {
    await this.newItemButton.click();
    await expect(this.visNewDialogGroups).toBeVisible();
  }

  async clickLegacyTab() {
    await this.legacyTab.click();
  }

  async clickVisType(type: VisType) {
    await this.page.testSubj.click(`visType-${type}`);
  }

  async clickAggBasedType(subType: string) {
    await this.clickLegacyTab();
    await this.clickVisType('aggbased');
    await expect(this.visNewDialogTypes).toBeVisible();
    await this.page.testSubj.click(`visType-${subType}`);
  }

  async selectDataSource(name: string) {
    await this.page.testSubj.click(`savedObjectTitle${name}`);
  }

  async waitForVisualizationLoaded() {
    await expect(this.visualizationLoader).toHaveAttribute('data-render-complete', 'true', {
      timeout: 30_000,
    });
  }

  async openSavedVisualization(title: string) {
    await this.page.testSubj.click(`visListingTitleLink-${title.split(' ').join('-')}`);
    await this.waitForVisualizationLoaded();
  }

  async openSaveModal() {
    await this.visualizeSaveButton.click();
    await expect(this.saveModal.modal).toBeVisible();
  }

  async saveToExistingDashboard(visName: string, dashboardTitle: string) {
    await this.openSaveModal();
    await this.saveModal.saveToExistingDashboard(visName, dashboardTitle);
  }

  async saveToNewDashboard(visName: string) {
    await this.openSaveModal();
    await this.saveModal.saveToNewDashboard(visName);
  }

  async saveToLibrary(visName: string) {
    await this.saveModal.saveToLibrary(visName);
  }

  async createAggBasedVisualization(subType: string, dataSource: string) {
    await this.goto();
    await this.openNewVisualizationWizard();
    await this.clickAggBasedType(subType);
    await this.selectDataSource(dataSource);
  }

  async createVegaVisualization() {
    await this.goto();
    await this.openNewVisualizationWizard();
    await this.clickVisType('vega');
    await this.waitForVisualizationLoaded();
  }

  async createMapVisualization() {
    await this.goto();
    await this.openNewVisualizationWizard();
    await this.clickVisType('maps');
    await expect(this.page.testSubj.locator('breadcrumb first')).toHaveText('Visualize library');
  }

  async createTSVBVisualization() {
    await this.goto();
    await this.openNewVisualizationWizard();
    await this.clickLegacyTab();
    await this.clickVisType('metrics');
    await this.waitForVisualizationLoaded();
  }

  async clickEditInLensButton() {
    await this.editInLensButton.click();
  }

  getEditInLensButton() {
    return this.editInLensButton;
  }
}
