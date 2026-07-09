/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';
import { EuiComboBoxWrapper } from '..';

// Increased timeout because new map container is not always loaded within default one
const DEFAULT_MAP_LOADING_TIMEOUT = 20_000;

interface MapView {
  lat: number;
  lon: number;
  zoom: number;
}

function viewsEqual(a: MapView, b: MapView) {
  return a.lat === b.lat && a.lon === b.lon && a.zoom === b.zoom;
}

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
  public readonly setViewForm;

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
    this.setViewForm = this.page.testSubj.locator('mapSetViewForm');
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

  private escapeLayerName(layerName: string) {
    return layerName.replace(/\s+/g, '_');
  }

  getLayerToggleButton(displayName: string) {
    return this.page.testSubj.locator(
      `layerTocActionsPanelToggleButton${this.escapeLayerName(displayName)}`
    );
  }

  async addDocumentsLayer(documentSelector: string) {
    await this.addLayerButton.click();
    await this.layerAddForm.waitFor({ state: 'visible' });
    await this.documentsItem.click();
    const comboBox = new EuiComboBoxWrapper(this.page, 'mapGeoIndexPatternSelect');
    await comboBox.selectSingleOption(documentSelector);
    await this.importFileButton.click();
    await this.waitForRenderComplete();
    await this.saveAndReturnButton.click();
  }

  /**
   * Waits for the layer TOC's loading spinner to clear — signals that a
   * layer data refetch (triggered by a query/filter change or refresh) has
   * finished. Unlike `waitForRenderComplete`, this can be awaited repeatedly:
   * the map's `data-render-complete` flag only ever flips once, on initial load.
   */
  async waitForLayersToLoad() {
    const toc = this.page.testSubj.locator('mapLayerTOC');
    await toc.locator('.euiLoadingSpinner').waitFor({ state: 'hidden' });
  }

  private async openLayerTocActionsPanel(layerName: string) {
    const panel = this.page.testSubj.locator(
      `layerTocActionsPanel${this.escapeLayerName(layerName)}`
    );
    if (!(await panel.isVisible())) {
      await this.getLayerToggleButton(layerName).click();
    }
  }

  private async openLayerPanel(layerName: string) {
    await this.openLayerTocActionsPanel(layerName);
    await this.page.testSubj.click('layerSettingsButton');
  }

  private async openSetViewPopover() {
    if (!(await this.setViewForm.isVisible())) {
      await this.page.testSubj.click('toggleSetViewVisibilityButton');
      await this.setViewForm.waitFor({ state: 'visible' });
    }
  }

  private async closeSetViewPopover() {
    if (await this.setViewForm.isVisible()) {
      // Re-clicking the toggle button doesn't reliably close this popover;
      // Escape (EUI's standard close-on-outside-interaction) does.
      await this.page.keyboard.press('Escape');
      await this.setViewForm.waitFor({ state: 'hidden' });
    }
  }

  async getView(): Promise<MapView> {
    await this.openSetViewPopover();
    const lat = await this.page.testSubj.locator('latitudeInput').inputValue();
    const lon = await this.page.testSubj.locator('longitudeInput').inputValue();
    const zoom = await this.page.testSubj.locator('zoomInput').inputValue();
    await this.closeSetViewPopover();
    return { lat: parseFloat(lat), lon: parseFloat(lon), zoom: parseFloat(zoom) };
  }

  async setView(lat: number, lon: number, zoom: number) {
    await this.openSetViewPopover();
    await this.page.testSubj.fill('latitudeInput', lat.toString());
    await this.page.testSubj.fill('longitudeInput', lon.toString());
    await this.page.testSubj.fill('zoomInput', zoom.toString());
    await this.page.testSubj.click('submitViewButton');
    await this.waitForViewStable();
  }

  /**
   * There is no DOM signal for "pan/zoom finished" (the map's
   * `data-render-complete` attribute only reflects the initial layer load),
   * so poll the set-view popover's lat/lon/zoom until it stops changing.
   * When `origView` is passed (async view changes, e.g. fit-to-bounds),
   * first wait for the view to start diverging from it.
   */
  private async waitForViewStable(origView?: MapView) {
    const deadline = Date.now() + 10_000;
    let current = await this.getView();
    if (origView) {
      while (viewsEqual(current, origView) && Date.now() < deadline) {
        await this.page.waitForTimeout(200);
        current = await this.getView();
      }
    }
    let previous = current;
    while (Date.now() < deadline) {
      await this.page.waitForTimeout(500);
      current = await this.getView();
      if (viewsEqual(current, previous)) {
        return;
      }
      previous = current;
    }
    throw new Error('Map view did not stabilize before timeout');
  }

  async clickFitToBounds(layerName: string) {
    const origView = await this.getView();
    await this.openLayerTocActionsPanel(layerName);
    await this.page.testSubj.click('fitToBoundsButton');
    await this.waitForViewStable(origView);
  }

  async setLayerQuery(layerName: string, query: string) {
    await this.openLayerPanel(layerName);
    await this.page.testSubj.click('mapLayerPanelOpenFilterEditorButton');
    const filterEditor = this.page.testSubj.locator('mapFilterEditor');
    const queryInput = filterEditor.getByTestId('queryInput');
    await queryInput.click();
    // QueryStringInput's fill() races with its React prop sync; type instead.
    await queryInput.pressSequentially(query);
    await this.page.testSubj.click('mapFilterEditorSubmitButton');
    await this.waitForLayersToLoad();
  }
}
