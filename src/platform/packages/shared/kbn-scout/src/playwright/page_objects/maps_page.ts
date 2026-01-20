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
}
