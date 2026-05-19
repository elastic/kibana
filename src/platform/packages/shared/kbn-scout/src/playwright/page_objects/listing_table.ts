/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from 'playwright/test';
import type { ScoutPage } from '..';

export class ListingTable {
  private readonly table: Locator;

  constructor(private readonly page: ScoutPage) {
    this.table = this.page.testSubj.locator('listingTable-isLoaded');
  }

  async waitUntilTableIsLoaded(options?: { timeout?: number }) {
    await this.table.waitFor({ state: 'visible', timeout: options?.timeout });
  }

  async getAllItemsNames(): Promise<string[]> {
    const links = this.table.locator('.euiTableRow .euiLink');
    return links.allTextContents();
  }
}
