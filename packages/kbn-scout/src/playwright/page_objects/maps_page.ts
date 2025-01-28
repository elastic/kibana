/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutPage, expect } from '..';

export class MapsPage {
  constructor(private readonly page: ScoutPage) {}

  async gotoNewMap() {
    await this.page.gotoApp('maps');
    await this.expectListingPage(false);
  }

  async expectListingPage(visible: boolean = true) {
    const listingPage = this.page.getByTestId(`MapsLandingPage`);

    if (visible) await expect(listingPage).toBeVisible();
    else await expect(listingPage).not.toBeVisible();
  }
}
