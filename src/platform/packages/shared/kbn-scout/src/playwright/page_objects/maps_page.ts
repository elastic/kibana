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

// Increased timeout because new map container is not always loaded within default one
const DEFAULT_MAP_LOADING_TIMEOUT = 20_000;

export class MapsPage {
  public readonly mapContainer;
  public readonly mapRenderComplete;
  public readonly saveAndReturnButton;
  public readonly saveButton;
  public readonly addLayerButton;
  public readonly layerAddForm;
  public readonly importFileButton;
  public readonly savedObjectTitleInput;
  public readonly returnToOriginSwitch;
  public readonly confirmSaveButton;
  public readonly documentsItem;

  constructor(private readonly page: ScoutPage) {
    this.mapContainer = this.page.locator('#maps-plugin');
    this.mapRenderComplete = this.mapContainer.locator(
      'div[data-dom-id][data-render-complete="true"]'
    );
    this.saveAndReturnButton = this.page.testSubj.locator('mapSaveAndReturnButton');
    this.saveButton = this.page.testSubj.locator('mapSaveButton');
    this.addLayerButton = this.page.testSubj.locator('addLayerButton');
    this.layerAddForm = this.page.testSubj.locator('layerAddForm');
    this.importFileButton = this.page.testSubj.locator('importFileButton');
    this.savedObjectTitleInput = this.page.testSubj.locator('savedObjectTitle');
    this.returnToOriginSwitch = this.page.testSubj.locator('returnToOriginModeSwitch');
    this.confirmSaveButton = this.page.testSubj.locator('confirmSaveSavedObjectButton');
    this.documentsItem = this.page.testSubj.locator('documents');
  }

  async gotoNewMap() {
    await this.page.gotoApp('maps/map');
    await this.waitForRenderComplete();
  }

  async waitForRenderComplete() {
    // first wait for the top level container to be present
    await this.mapContainer.waitFor({ state: 'visible', timeout: DEFAULT_MAP_LOADING_TIMEOUT });
    // then wait for the map to be fully rendered
    return this.mapRenderComplete.waitFor({
      state: 'attached',
      timeout: DEFAULT_MAP_LOADING_TIMEOUT,
    });
  }

  async selectLayerWizardByTitle(title: string) {
    const wizardTestSubj = title
      .split(' ')
      .map((segment, index) =>
        index === 0 ? segment.toLowerCase() : segment.charAt(0).toUpperCase() + segment.slice(1)
      )
      .join('');
    await this.page.testSubj.click(wizardTestSubj);
  }

  async saveFromModal(title: string, { redirectToOrigin = true }: { redirectToOrigin?: boolean }) {
    await this.savedObjectTitleInput.fill(title);
    if (await this.returnToOriginSwitch.isVisible()) {
      const isChecked = (await this.returnToOriginSwitch.getAttribute('aria-checked')) === 'true';
      if (isChecked !== redirectToOrigin) {
        await this.returnToOriginSwitch.click();
      }
    }
    await this.confirmSaveButton.click();
    await this.confirmSaveButton.waitFor({ state: 'hidden' });
  }

  getLayerToggleButton(displayName: string) {
    const escapedName = displayName.replace(/\s+/g, '_');
    return this.page.testSubj.locator(`layerTocActionsPanelToggleButton${escapedName}`);
  }

  async addDocumentsLayer(documentSelector: string) {
    await this.addLayerButton.click();
    await this.layerAddForm.waitFor({ state: 'visible' });
    await this.documentsItem.click();
    const comboBox = this.page.components.comboBox('mapGeoIndexPatternSelect');
    await comboBox.setSelectedOptions([documentSelector]);
    await this.importFileButton.click();
    await this.waitForRenderComplete();
    await this.saveAndReturnButton.click();
  }

  private escapeLayerName(layerName: string): string {
    return layerName.split(' ').join('_');
  }

  /** Waits until Map layer TOC has entries and loading indicators are gone (FTR parity). */
  async waitForLayersToLoad() {
    const tableOfContents = this.page.testSubj.locator('mapLayerTOC');
    await tableOfContents.waitFor({ state: 'visible', timeout: DEFAULT_MAP_LOADING_TIMEOUT });
    const layerToggles = tableOfContents.locator(
      '[data-test-subj^="layerTocActionsPanelToggleButton"]'
    );
    // Maps uses EuiLoadingSpinner (role=progressbar) while a layer loads; there is no
    // dedicated layer-loading data-test-subj, so wait for toggles + no progressbars.
    await expect
      .poll(
        async () => {
          const layerCount = await layerToggles.count();
          const spinnerCount = await tableOfContents.getByRole('progressbar').count();
          return layerCount > 0 && spinnerCount === 0;
        },
        { timeout: DEFAULT_MAP_LOADING_TIMEOUT }
      )
      .toBe(true);
  }

  async doesLayerExist(layerName: string): Promise<boolean> {
    return this.getLayerToggleButton(layerName).isVisible();
  }

  async getLayerTocTooltipMsg(layerName: string): Promise<string> {
    const toggle = this.page.testSubj.locator(
      `layerTocActionsPanelToggleButton${this.escapeLayerName(layerName)}`
    );
    await toggle.hover();
    const tooltip = this.page.testSubj.locator('layerTocTooltip');
    await tooltip.waitFor({ state: 'visible', timeout: 10_000 });
    // Normalize whitespace — tooltip lines can include leading spaces from TOC layout.
    return (await tooltip.innerText())
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');
  }

  /** Reloads the page and dismisses the unsaved-changes browser dialog if present. */
  async refreshAndClearUnsavedChangesWarning() {
    this.page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await this.page.reload();
  }
}
