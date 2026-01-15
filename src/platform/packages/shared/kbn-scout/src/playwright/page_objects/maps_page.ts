/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';

// Increased timeout because new map container is not always loaded within default one
const DEFAULT_MAP_LOADING_TIMEOUT = 20_000;

export class MapsPage {
  constructor(private readonly page: ScoutPage) {}

  async gotoNewMap() {
    return this.page.gotoApp('maps/map');
  }

  async waitForRenderComplete() {
    // first wait for the top level container to be present
    await this.page.locator('div#maps-plugin').waitFor({ timeout: DEFAULT_MAP_LOADING_TIMEOUT });
    // then wait for the map to be fully rendered
    return this.page
      .locator('div[data-dom-id][data-render-complete="true"]')
      .waitFor({ timeout: DEFAULT_MAP_LOADING_TIMEOUT });
  }

  async clickSaveAndReturnButton() {
    await this.page.testSubj.click('mapSaveAndReturnButton');
  }

  async clickSaveButton() {
    await this.page.testSubj.click('mapSaveButton');
  }

  async clickAddLayer() {
    await this.page.testSubj.click('addLayerButton');
    await this.page.testSubj.waitForSelector('layerAddForm', { state: 'visible' });
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

  async clickImportFileButton() {
    await this.page.testSubj.click('importFileButton');
  }

  async saveFromModal(title: string, { redirectToOrigin = true }: { redirectToOrigin?: boolean }) {
    await this.page.testSubj.fill('savedObjectTitle', title);
    const returnToOrigin = this.page.testSubj.locator('returnToOriginModeSwitch');
    if ((await returnToOrigin.count()) > 0) {
      const isChecked = (await returnToOrigin.getAttribute('aria-checked')) === 'true';
      if (isChecked !== redirectToOrigin) {
        await returnToOrigin.click();
      }
    }
    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await this.page.testSubj.waitForSelector('confirmSaveSavedObjectButton', { state: 'hidden' });
  }

  async doesLayerExist(displayName: string) {
    const escapedName = displayName.split(' ').join('_');
    const locator = this.page.testSubj.locator(`layerTocActionsPanelToggleButton${escapedName}`);
    return (await locator.count()) > 0;
  }
}
