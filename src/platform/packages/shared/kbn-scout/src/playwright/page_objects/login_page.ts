/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '../fixtures/scope/test';
import type { KibanaUrl } from '../../common/services/kibana_url';

export class LoginPage {
  public readonly loginBtn;
  public readonly roleSelectionInput;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.loginBtn = this.page.testSubj.locator('loginButton');
    this.roleSelectionInput = this.page.getByRole('combobox');
  }

  async goto() {
    await this.page.goto(this.kbnUrl.get('/login'));
    await this.page.testSubj.locator('loginSubmit').waitFor({ state: 'visible' });
  }

  async loginWithRole(role: string) {
    await this.loginBtn.waitFor({ state: 'visible' });
    await this.roleSelectionInput.fill(role);
    await this.loginBtn.click();
  }
}
