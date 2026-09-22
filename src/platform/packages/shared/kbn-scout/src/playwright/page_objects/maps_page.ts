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
import { AppMenu } from './app_menu';
import { SavedObjectSaveModal } from './saved_object_save_modal';

// Maps first paint regularly exceeds Scout's 10s actionTimeout under parallel load.
const DEFAULT_MAP_LOADING_TIMEOUT = 20_000;

export class MapsPage {
  public readonly mapsPlugin;
  public readonly mapRenderComplete;
  public readonly saveAndReturnButton;
  public readonly saveButton;
  public readonly addLayerButton;
  public readonly layerAddForm;
  public readonly importFileButton;
  public readonly returnToOriginSwitch;
  public readonly documentsItem;
  public readonly fullScreenModeButton;
  public readonly exitFullScreenButton;
  private readonly mapLayerToc;
  private readonly layerTocTooltip;
  private readonly appMenu: AppMenu;
  private readonly mapContainer;
  private readonly setViewForm;
  /** Save modal locators/actions, shared with other apps (e.g. Visualize) via `SavedObjectSaveModal`. */
  public readonly saveModal: SavedObjectSaveModal;

  constructor(private readonly page: ScoutPage) {
    this.mapsPlugin = this.page.locator('#maps-plugin');
    this.mapRenderComplete = this.page.locator('#maps-plugin[data-map-loaded="true"]');
    this.saveAndReturnButton = this.page.testSubj.locator('mapSaveAndReturnButton');
    this.saveButton = this.page.testSubj.locator('mapSaveButton');
    this.addLayerButton = this.page.testSubj.locator('addLayerButton');
    this.layerAddForm = this.page.testSubj.locator('layerAddForm');
    this.importFileButton = this.page.testSubj.locator('importFileButton');
    this.returnToOriginSwitch = this.page.testSubj.locator('returnToOriginModeSwitch');
    this.documentsItem = this.page.testSubj.locator('documents');
    this.fullScreenModeButton = this.page.testSubj.locator('mapsFullScreenMode');
    this.exitFullScreenButton = this.page.testSubj.locator('exitFullScreenModeButton');
    this.appMenu = new AppMenu(this.page);
    this.mapLayerToc = this.page.testSubj.locator('mapLayerTOC');
    this.layerTocTooltip = this.page.testSubj.locator('layerTocTooltip');
    this.mapContainer = this.page.testSubj.locator('mapContainer');
    this.setViewForm = this.page.testSubj.locator('mapSetViewForm');
    this.saveModal = new SavedObjectSaveModal(this.page);
  }

  async gotoNewMap() {
    await this.page.gotoApp('maps/map');
    await this.waitForRenderComplete();
  }

  /** Opens the AppHeader overflow menu when Full screen is not inline. */
  async revealFullScreenModeButton() {
    await this.appMenu.revealItem(this.fullScreenModeButton);
  }

  async clickFullScreenMode() {
    await this.revealFullScreenModeButton();
    await this.fullScreenModeButton.click();
  }

  /** Save sits in overflow during save-and-return; primary is Save and return. */
  async clickSaveButton() {
    await this.appMenu.revealItem(this.saveButton);
    await this.saveButton.click();
  }

  async waitForRenderComplete() {
    // first wait for the top level container to be present
    await this.mapsPlugin.waitFor({ state: 'visible', timeout: DEFAULT_MAP_LOADING_TIMEOUT });
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
    await this.saveModal.fillTitle(title);
    if (await this.returnToOriginSwitch.isVisible()) {
      const isChecked = (await this.returnToOriginSwitch.getAttribute('aria-checked')) === 'true';
      if (isChecked !== redirectToOrigin) {
        await this.returnToOriginSwitch.click();
      }
    }
    await this.saveModal.confirm();
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

  /** Waits until Map layer TOC has entries and loading indicators are gone (FTR parity). */
  async waitForLayersToLoad() {
    await this.mapLayerToc.waitFor({ state: 'visible', timeout: DEFAULT_MAP_LOADING_TIMEOUT });
    // Maps uses EuiLoadingSpinner (role=progressbar) while a layer loads; there is no
    // dedicated layer-loading data-test-subj, so wait for toggles + no progressbars.
    await this.page.waitForFunction(
      () => {
        const toc = document.querySelector('[data-test-subj="mapLayerTOC"]');
        if (!toc) {
          return false;
        }
        const layerCount = toc.querySelectorAll(
          '[data-test-subj^="layerTocActionsPanelToggleButton"]'
        ).length;
        const spinnerCount = toc.querySelectorAll('[role="progressbar"]').length;
        return layerCount > 0 && spinnerCount === 0;
      },
      undefined,
      { timeout: DEFAULT_MAP_LOADING_TIMEOUT }
    );
  }

  async getLayerTocTooltipMsg(layerName: string): Promise<string> {
    await this.getLayerToggleButton(layerName).hover();
    await this.layerTocTooltip.waitFor({ state: 'visible' });
    // Normalize whitespace — tooltip lines can include leading spaces from TOC layout.
    return (await this.layerTocTooltip.innerText())
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

  private async openSetViewPopover() {
    if (!(await this.setViewForm.isVisible())) {
      await this.page.testSubj.click('toggleSetViewVisibilityButton');
      await this.setViewForm.waitFor({ state: 'visible' });
    }
  }

  private async closeSetViewPopover() {
    if (await this.setViewForm.isVisible()) {
      await this.page.testSubj.click('toggleSetViewVisibilityButton');
      await this.setViewForm.waitFor({ state: 'hidden' });
    }
  }

  async setView(lat: number, lon: number, zoom: number) {
    await this.openSetViewPopover();
    await this.page.testSubj.locator('latitudeInput').fill(lat.toString());
    await this.page.testSubj.locator('longitudeInput').fill(lon.toString());
    await this.page.testSubj.locator('zoomInput').fill(zoom.toString());
    await this.page.testSubj.click('submitViewButton');
    await this.waitForRenderComplete();
  }

  async getView(): Promise<{ lat: number; lon: number; zoom: number }> {
    await this.openSetViewPopover();
    const lat = await this.page.testSubj.locator('latitudeInput').inputValue();
    const lon = await this.page.testSubj.locator('longitudeInput').inputValue();
    const zoom = await this.page.testSubj.locator('zoomInput').inputValue();
    await this.closeSetViewPopover();
    return { lat: parseFloat(lat), lon: parseFloat(lon), zoom: parseFloat(zoom) };
  }

  /**
   * Clicks the map at a position relative to the container's center to lock the tooltip.
   * xOffset/yOffset follow the FTR convention: positive x = right, negative y = up.
   * Retries until mapTooltipCloseButton appears (i.e. a feature was hit and tooltip locked).
   */
  async lockTooltipAtPosition(xOffset: number, yOffset: number) {
    await this.mapContainer.waitFor({ state: 'visible' });
    const closeButton = this.page.testSubj.locator('mapTooltipCloseButton');

    await expect(async () => {
      const box = await this.mapContainer.boundingBox();
      if (!box) throw new Error('Map container bounding box not found');
      await this.page.mouse.click(
        box.x + box.width / 2 + xOffset,
        box.y + box.height / 2 + yOffset
      );
      await closeButton.waitFor({ state: 'visible', timeout: 2000 });
    }).toPass({ timeout: 15000 });
  }
}
