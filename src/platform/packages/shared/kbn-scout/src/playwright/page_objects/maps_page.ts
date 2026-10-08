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
import { DatePicker } from './date_picker';
import { InspectorPage } from './inspector';
import { QueryBar } from './query_bar';
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
  private readonly datePicker: DatePicker;
  private readonly queryBar: QueryBar;
  private readonly mapContainer;
  private readonly setViewForm;
  /** Save modal locators/actions, shared with other apps (e.g. Visualize) via `SavedObjectSaveModal`. */
  public readonly saveModal: SavedObjectSaveModal;
  public readonly inspector: InspectorPage;

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
    this.datePicker = new DatePicker(this.page);
    this.queryBar = new QueryBar(this.page);
    this.layerTocTooltip = this.page.testSubj.locator('layerTocTooltip');
    this.mapContainer = this.page.testSubj.locator('mapContainer');
    this.setViewForm = this.page.testSubj.locator('mapSetViewForm');
    this.saveModal = new SavedObjectSaveModal(this.page);
    this.inspector = new InspectorPage(this.page);
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

  async doesLayerExist(layerName: string) {
    return this.getLayerToggleButton(layerName).isVisible();
  }

  async selectFileUploadCard() {
    await this.page.testSubj.click('uploadFile');
  }

  async getNumberOfLayers() {
    return this.page.locator('.mapTocEntry').count();
  }

  async openAddLayerFlyout() {
    await this.addLayerButton.click();
    await this.layerAddForm.waitFor({ state: 'visible' });
  }

  async selectGeoIndexPatternLayer(indexPattern: string) {
    await this.page.components
      .comboBox('mapGeoIndexPatternSelect')
      .setSelectedOptions([indexPattern]);
  }

  async addDocumentsLayer(indexPattern: string) {
    await this.openAddLayerFlyout();
    await this.documentsItem.click();
    await this.selectGeoIndexPatternLayer(indexPattern);
    await this.importFileButton.click();
    await this.waitForRenderComplete();
    await this.saveAndReturnButton.click();
  }

  /** Waits until map layers are loaded. */
  async waitForLayersToLoad() {
    await this.mapContainer.waitFor({ state: 'visible', timeout: DEFAULT_MAP_LOADING_TIMEOUT });

    // Mapbox GL renders a <canvas> only after mapApi is initialised; mapContainer is
    // visible before that, so gate on this signal before checking loading state.
    await this.page.waitForFunction(
      () =>
        Boolean(document.querySelector('[data-test-subj="mapContainer"]')?.querySelector('canvas')),
      undefined,
      { timeout: DEFAULT_MAP_LOADING_TIMEOUT }
    );

    await this.waitForLoadCycleIfNeeded();

    await expect
      .poll(() => this.mapContainer.getAttribute('data-map-loading').then((v) => v === 'true'), {
        timeout: DEFAULT_MAP_LOADING_TIMEOUT,
      })
      .toBe(false);
  }

  /**
   * If the map is not currently loading, waits up to 1000 ms for a load cycle to begin —
   * bridging the gap between a triggering action resolving and the new request's loading
   * state reaching the DOM. Falls through if no load starts in that window
   * (e.g. the action required no re-fetch).
   */
  private async waitForLoadCycleIfNeeded() {
    const alreadyLoading = (await this.mapContainer.getAttribute('data-map-loading')) === 'true';
    if (!alreadyLoading) {
      await this.page
        .waitForFunction(
          () =>
            document
              .querySelector('[data-test-subj="mapContainer"]')
              ?.getAttribute('data-map-loading') === 'true',
          undefined,
          { timeout: 1000 }
        )
        .catch(() => {});
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

  async setView(lat: number, lon: number, zoom: number) {
    await this.openSetViewPopover();
    await this.page.testSubj.locator('latitudeInput').fill(lat.toString());
    await this.page.testSubj.locator('longitudeInput').fill(lon.toString());
    await this.page.testSubj.locator('zoomInput').fill(zoom.toString());
    await this.page.testSubj.click('submitViewButton');
    await this.waitForMapPanAndZoom();
  }

  async waitForMapPanAndZoom(origView?: { lat: number; lon: number; zoom: number }) {
    if (origView) {
      // Wait until the view has changed from origView (pan has started).
      await expect
        .poll(
          async () => {
            const currentView = await this.getView();
            return JSON.stringify(currentView) !== JSON.stringify(origView);
          },
          { timeout: DEFAULT_MAP_LOADING_TIMEOUT, intervals: [500] }
        )
        .toBe(true);
    }

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
    const attrs = await this.mapContainer.evaluate((el) => ({
      lat: (el as HTMLElement).dataset.mapLat,
      lon: (el as HTMLElement).dataset.mapLon,
      zoom: (el as HTMLElement).dataset.mapZoom,
    }));
    if (attrs.lat === undefined || attrs.lon === undefined || attrs.zoom === undefined) {
      throw new Error('Map view data attributes not found on mapContainer');
    }
    return { lat: parseFloat(attrs.lat), lon: parseFloat(attrs.lon), zoom: parseFloat(attrs.zoom) };
  }

  async openMapWithId(id: string) {
    await this.page.gotoApp(`maps/map/${id}`);
    await this.waitForLayersToLoad();
  }

  /**
   * Opens the inspector, selects a request by name, reads its raw JSON response,
   * closes the inspector, and returns the parsed response body.
   */
  async getResponse(requestName: string): ReturnType<typeof this.inspector.getResponse> {
    await this.inspector.open();
    try {
      await this.inspector.openInspectorRequestsView();

      const comboBox = this.page.components.comboBox('inspectorRequestChooser');
      await comboBox.setSelectedOptions([requestName]);

      return await this.inspector.getResponse();
    } finally {
      await this.inspector.close();
    }
  }

  /**
   * Opens the inspector, switches to the Requests view, optionally selects `requestName`,
   * switches to the statistics tab, calls `getStat` to read a value, closes the inspector,
   * and returns the result.
   */
  private async getRequestStat(
    getStat: () => Promise<string>,
    requestName?: string
  ): Promise<string> {
    await this.inspector.open();
    try {
      await this.inspector.openInspectorRequestsView();
      if (requestName) {
        await this.page.components
          .comboBox('inspectorRequestChooser')
          .setSelectedOptions([requestName]);
      }
      await this.inspector.openRequestsStatisticsTab();
      return await getStat();
    } finally {
      await this.inspector.close();
    }
  }

  /**
   * Opens the inspector, reads "Hits" from the statistics tab of the optionally
   * selected `requestName`, closes the inspector, and returns the value.
   */
  async getHits(requestName?: string): Promise<string> {
    return this.getRequestStat(() => this.inspector.getHits(), requestName);
  }

  /**
   * Opens the inspector, reads "Request timestamp" from the statistics tab of the
   * optionally selected `requestName`, closes the inspector, and returns the value.
   */
  async getRequestTimestamp(requestName?: string): Promise<string> {
    return this.getRequestStat(
      () => this.inspector.getRequestTimestamp(),
      requestName
    );
  }

  /** Opens the map settings panel and enables "Auto fit map to data bounds". */
  async enableAutoFitToBounds() {
    await this.appMenu.clickItem('openSettingsButton');
    const autoFitSwitch = this.page.testSubj.locator('autoFitToDataBoundsSwitch');
    await autoFitSwitch.waitFor({ state: 'visible' });
    if ((await autoFitSwitch.getAttribute('aria-checked')) !== 'true') {
      await autoFitSwitch.click();
      await this.page.waitForFunction(
        (subj) =>
          document.querySelector(`[data-test-subj="${subj}"]`)?.getAttribute('aria-checked') ===
          'true',
        'autoFitToDataBoundsSwitch'
      );
    }
    await this.page.testSubj.click('mapSettingSubmitButton');
  }

  /** Sets the KQL query in the search bar, submits it, and waits for layers to load. */
  async setAndSubmitQuery(query: string) {
    await this.queryBar.setQuery(query);
    await this.queryBar.submitQuery();
    await this.waitForLayersToLoad();
  }

  /**
   * Opens the inspector, switches to the "Map details" view, reads the Mapbox GL
   * style JSON from the mapboxStyleContainer, closes the inspector, and returns the
   * parsed style object.
   */
  async getMapboxStyle(): Promise<Record<string, any>> {
    await this.inspector.open();
    try {
      await this.inspector.openInspectorView('Map details');
      await this.page.testSubj.click('mapboxStyleTab');
      const container = this.page.testSubj.locator('mapboxStyleContainer');
      await container.waitFor({ state: 'visible' });
      // EuiCodeBlock renders a visually-hidden screen reader label (wrapped in ✄𐘗
      // NO_COPY_BOUND markers) inside the <pre> tag before the <code> element.
      // Calling innerText() on the container includes that hidden text, producing
      // invalid JSON. Target the <code> element directly to get only the code content.
      const json = await container.locator('code').innerText();
      return JSON.parse(json);
    } finally {
      await this.inspector.close();
    }
  }

  /**
   * Opens the layer's TOC actions panel by name, clicks "Fit to data bounds",
   * and waits for the map to pan/zoom to the new extent.
   */
  async clickFitToBounds(layerName: string) {
    const origView = await this.getView();
    await this.getLayerToggleButton(layerName).click();
    await this.page.testSubj.click('fitToBoundsButton');
    await this.waitForMapPanAndZoom(origView);
  }

  /** Returns the visible text of the layer's TOC details section (legend content). */
  async getLayerTOCDetails(layerName: string) {
    const escapedName = layerName.replace(/\s+/g, '_');
    return this.page.testSubj.locator(`mapLayerTOCDetails${escapedName}`).innerText();
  }

  /** Opens the settings panel for the given layer. */
  async openLayerPanel(layerName: string) {
    const escapedName = layerName.replace(/\s+/g, '_');
    await this.getLayerToggleButton(layerName).click();
    await this.page.testSubj
      .locator(`layerTocActionsPanel${escapedName}`)
      .waitFor({ state: 'visible' });
    await this.page.testSubj.click('layerSettingsButton');
    await this.waitForLayersToLoad();
  }

  /** Closes the currently open layer settings panel. */
  async closeLayerPanel() {
    await this.page.testSubj.click('layerPanelCancelButton');
    await this.waitForLayersToLoad();
  }

  /**
   * Opens the layer settings panel for `layerName`, sets a join where-clause
   * to `query`, submits it, and waits for layers to reload.
   */
  async setJoinWhereQuery(layerName: string, query: string) {
    await this.page.testSubj.click('mapJoinWhereExpressionButton');
    const queryInput = this.page.locator(
      '[data-test-subj="mapJoinWhereFilterEditor"] [data-test-subj="queryInput"]'
    );
    await queryInput.click();
    await queryInput.fill(query);
    await this.page.testSubj.click('mapWhereFilterEditorSubmitButton');
    await this.waitForLayersToLoad();
  }

  /** Opens the layer panel for `layerName`, clicks Remove, confirms, and waits for the layer to disappear. */
  async removeLayer(layerName: string) {
    await this.openLayerPanel(layerName);
    await this.page.testSubj.click('mapRemoveLayerButton');
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
    await expect.poll(() => this.doesLayerExist(layerName), { timeout: 10_000 }).toBe(false);
  }

  /**
   * Opens the inspector, switches to Requests view, and returns true when the
   * "no requests" message is visible (i.e. all layers have been removed).
   */
  async doesInspectorHaveRequests() {
    await this.inspector.open();
    try {
      await this.inspector.openInspectorRequestsView();
      return this.page.testSubj.locator('inspectorNoRequestsMessage').isVisible();
    } finally {
      await this.inspector.close();
    }
  }

  /**
   * Starts a 1-second auto-refresh cycle, waits for `refreshInterval` + 50 %
   * so that at least one refresh fires, then pauses auto-refresh and waits for
   * layers to finish loading.
   */
  async triggerSingleRefresh(refreshInterval: number) {
    await this.datePicker.startAutoRefresh(1);
    await this.page.waitForTimeout(refreshInterval + Math.ceil(refreshInterval / 2));
    await this.datePicker.pauseAutoRefresh();
    await this.waitForLayersToLoad();
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
