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

export class Chrome {
  public readonly layoutNavigation: Locator;
  public readonly primaryNavigation: Locator;
  public readonly primaryNavigationItems: Locator;
  public readonly pageTitle: Locator;
  public readonly logo: Locator;
  public readonly searchInput: Locator;
  public readonly searchNoResults: Locator;

  private readonly nextChromeHeader: Locator;
  private readonly searchButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.layoutNavigation = page.testSubj.locator('kbnChromeLayoutNavigation');
    this.primaryNavigation = page.testSubj.locator('kbnChromeNav-primaryNavigation');
    this.primaryNavigationItems = this.primaryNavigation.locator(
      '[data-test-subj*="nav-item-id-"]'
    );
    this.pageTitle = page.testSubj
      .locator('appHeaderTitle')
      .or(page.locator('.euiPageHeader h1.euiTitle'))
      .filter({ visible: true });
    this.logo = page.testSubj.locator('nav-header-logo');
    this.searchInput = page.testSubj.locator('nav-search-input');
    this.searchNoResults = page.getByRole('status').getByTestId('nav-search-no-results');
    this.nextChromeHeader = page.testSubj.locator('chromeNextGlobalHeader');
    this.searchButton = page.testSubj.locator('chromeNextGlobalHeaderSearchButton');
  }

  async isNextChrome(): Promise<boolean> {
    return this.nextChromeHeader.isVisible();
  }

  async clickLogo(): Promise<void> {
    await this.logo.click();
  }

  async openSearch(): Promise<void> {
    await this.searchButton.click();
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  getSearchOptionByUrl(url: string): Locator {
    return this.page.locator(`[data-test-subj="nav-search-option"][url="${url}"]`);
  }

  navItemInPrimaryById(id: string): Locator {
    return this.primaryNavigation.locator(`[data-test-subj~="nav-item-id-${id}"]`);
  }

  badgeWithLabel(label: string): Locator {
    const classicBadge = this.page
      .getByTestId('headerBadge')
      .and(this.page.locator(`[data-test-badge-label="${label}"]`));
    const chromeNextBadge = this.page.getByTestId('appHeaderBadge').filter({ hasText: label });

    return classicBadge.or(chromeNextBadge).filter({ visible: true });
  }
}
