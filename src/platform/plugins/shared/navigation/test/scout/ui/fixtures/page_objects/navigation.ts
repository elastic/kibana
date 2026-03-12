/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

export class Navigation {
  constructor(private readonly page: ScoutPage) {}

  async goToSecurity() {
    await this.page.gotoApp('security');
    await this.page.testSubj.locator('kbnChromeLayoutNavigation').waitFor({ state: 'visible' });
  }

  async clickLogo() {
    await this.page.testSubj.locator('nav-header-logo').waitFor({ state: 'visible' });
    await this.page.testSubj.click('nav-header-logo');
  }

  getSidenav() {
    return this.page.testSubj.locator('kbnChromeLayoutNavigation');
  }

  getBreadcrumbByText(text: string) {
    return this.page.locator('.euiBreadcrumb', { hasText: text });
  }
}
