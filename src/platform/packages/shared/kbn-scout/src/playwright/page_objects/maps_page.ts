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
  private readonly layerTocTooltip;
  private readonly appMenu: AppMenu;
  private readonly mapContainer;
  private readonly setViewForm;
  /** Save modal locators/actions, shared with other apps (e.g. Visualize) via `SavedObjectSaveModal`. */
  public readonly saveModal: SavedObjectSaveModal;

  constructor(private readonly page: ScoutPage) {
    // Only present when Maps is the top-level app (standalone). Not available in embeddable contexts (e.g. dashboard panels).
    this.mapsPlugin = this.page.locator('#maps-plugin');
    // Only present when Maps is the top-level app (standalone). Not available in embeddable contexts (e.g. dashboard panels).
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

  /** Waits until map layers are loaded. Works in both standalone (expanded TOC) and minimized TOC contexts. */
  async waitForLayersToLoad() {
    await this.mapContainer.waitFor({ state: 'visible', timeout: DEFAULT_MAP_LOADING_TIMEOUT });

    // Mapbox GL renders a <canvas> only after mapApi is initialised; mapContainer is
    // visible before that, so gate both branches on this signal.
    await this.page.waitForFunction(
      () =>
        Boolean(document.querySelector('[data-test-subj="mapContainer"]')?.querySelector('canvas')),
      undefined,
      { timeout: DEFAULT_MAP_LOADING_TIMEOUT }
    );

    // Wait until one of the two TOC states has rendered before branching; an immediate
    // isVisible() snapshot after mapContainer can race with the TOC appearing.
    const mapLayerToc = this.page.testSubj.locator('mapLayerTOC');
    const expandButton = this.page.testSubj.locator('mapExpandLayerControlButton');
    await this.page
      .locator('[data-test-subj="mapLayerTOC"], [data-test-subj="mapExpandLayerControlButton"]')
      .waitFor({ state: 'visible', timeout: DEFAULT_MAP_LOADING_TIMEOUT });

    if (await mapLayerToc.isVisible()) {
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
    } else {
      await expandButton.waitFor({ state: 'visible', timeout: DEFAULT_MAP_LOADING_TIMEOUT });
      await expect(expandButton.locator('[role="progressbar"]')).toHaveCount(0, {
        timeout: DEFAULT_MAP_LOADING_TIMEOUT,
      });
    }
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
    // timeout: 0 prevents waiting for the element to appear — the form only exists in
    // the DOM when the popover is open, so without it Playwright retries for 10s and throws.
    if (!(await this.setViewForm.isVisible({ timeout: 1_000 }))) {
      await this.page.testSubj.click('toggleSetViewVisibilityButton');
      await this.setViewForm.waitFor({ state: 'visible' });
    }
  }

  private async closeSetViewPopover() {
    // timeout: 0 prevents waiting for the element to appear — the form only exists in
    // the DOM when the popover is open, so without it Playwright retries for 10s and throws.
    if (await this.setViewForm.isVisible({ timeout: 1_000 })) {
      // page.keyboard.press is more robust than setViewForm.press in embedded contexts:
      // during map panning the dashboard re-renders the panel, detaching the form element,
      // which causes locator.press to retry until it times out.
      await this.page.keyboard.press('Escape');
      await this.setViewForm.waitFor({ state: 'hidden', timeout: DEFAULT_MAP_LOADING_TIMEOUT });
    }
  }

  async setView(lat: number, lon: number, zoom: number) {
    await this.openSetViewPopover();
    await this.page.testSubj.locator('latitudeInput').fill(lat.toString());
    await this.page.testSubj.locator('longitudeInput').fill(lon.toString());
    await this.page.testSubj.locator('zoomInput').fill(zoom.toString());
    await this.page.testSubj.click('submitViewButton');
    await this.waitForMapPanAndZoom();
  }

  async waitForMapPanAndZoom() {
    let prevView: { lat: number; lon: number; zoom: number } | undefined;
    await expect
      .poll(
        async () => {
          const currentView = await this.getView();
          const stable =
            prevView !== undefined && JSON.stringify(prevView) === JSON.stringify(currentView);
          prevView = currentView;
          return stable;
        },
        { timeout: DEFAULT_MAP_LOADING_TIMEOUT, intervals: [1000] }
      )
      .toBe(true);
    await this.waitForLayersToLoad();
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
   * Waits for layers to be ready before clicking, then asserts the locked tooltip separately.
   */
  async lockTooltipAtPosition(xOffset: number, yOffset: number) {
    await this.waitForLayersToLoad();

    const box = await this.mapContainer.boundingBox();
    if (!box) throw new Error('Map container bounding box not found');
    const x = box.x + box.width / 2 + xOffset;
    const y = box.y + box.height / 2 + yOffset;
    await this.page.mouse.move(x, y);
    await this.page.mouse.click(x, y);

    await this.page.testSubj
      .locator('mapTooltipCloseButton')
      .waitFor({ state: 'visible', timeout: DEFAULT_MAP_LOADING_TIMEOUT });
  }
}
