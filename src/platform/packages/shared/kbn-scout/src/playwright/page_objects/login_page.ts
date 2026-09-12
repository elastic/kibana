/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from 'playwright/test';
import type { ScoutPage } from '../fixtures/scope/test';
import type { KibanaUrl } from '../../common/services/kibana_url';

export class LoginPage {
  public readonly loginBtn: Locator;
  public readonly roleSelectionInput: Locator;
  public readonly usernameInput: Locator;
  public readonly passwordInput: Locator;
  public readonly submitButton: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.loginBtn = this.page.testSubj.locator('loginButton');
    this.roleSelectionInput = this.page.getByRole('combobox');
    this.usernameInput = this.page.testSubj.locator('loginUsername');
    this.passwordInput = this.page.testSubj.locator('loginPassword');
    this.submitButton = this.page.testSubj.locator('loginSubmit');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.kbnUrl.get('/login'));
    await this.submitButton.waitFor({ state: 'visible' });
  }

  async loginWithRole(role: string): Promise<void> {
    await this.loginBtn.waitFor({ state: 'visible' });
    await this.roleSelectionInput.fill(role);
    await this.loginBtn.click();
  }

  /**
   * Logs in through the native username/password form at `/login`.
   * Use this when SAML (`browserAuth`) cannot exercise the flow (e.g. password change).
   */
  async loginWithUsernamePassword(username: string, password: string): Promise<void> {
    await this.goto();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForURL(/\/app\//);
  }
}
