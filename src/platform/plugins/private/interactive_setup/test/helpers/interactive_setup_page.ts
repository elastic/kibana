/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';

import type { KibanaUrl, ScoutPage } from '@kbn/scout';

/**
 * Drives the interactive-setup (first-boot) wizard, which is served by Kibana's `preboot` server
 * before any Elasticsearch connection is configured.
 *
 * The wizard has three screens, and which of them appear depends on the cluster being connected to:
 * 1. the enrollment-token screen (landing screen), which can also hand off to
 * 2. the cluster-address screen, followed by
 * 3. the cluster-configuration screen — credentials appear only when the cluster has security
 *    enabled, and the certificate-authority card only when it is served over TLS.
 */
export class InteractiveSetupPage {
  private readonly enrollmentTokenInput: Locator;
  private readonly submitEnrollmentTokenButton: Locator;
  private readonly configureManuallyButton: Locator;
  private readonly clusterAddressInput: Locator;
  private readonly checkAddressButton: Locator;
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly trustCaCertCheckbox: Locator;
  private readonly submitConfigurationButton: Locator;
  private readonly progressIndicator: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.enrollmentTokenInput = page.testSubj.locator('interactiveSetupEnrollmentTokenInput');
    this.submitEnrollmentTokenButton = page.testSubj.locator(
      'interactiveSetupSubmitEnrollmentTokenButton'
    );
    this.configureManuallyButton = page.testSubj.locator('interactiveSetupConfigureManuallyButton');
    this.clusterAddressInput = page.testSubj.locator('interactiveSetupClusterAddressInput');
    this.checkAddressButton = page.testSubj.locator('interactiveSetupCheckAddressButton');
    this.usernameInput = page.testSubj.locator('interactiveSetupUsernameInput');
    this.passwordInput = page.testSubj.locator('interactiveSetupPasswordInput');
    this.trustCaCertCheckbox = page.testSubj.locator('interactiveSetupTrustCaCertCheckbox');
    this.submitConfigurationButton = page.testSubj.locator(
      'interactiveSetupSubmitConfigurationButton'
    );
    this.progressIndicator = page.testSubj.locator('interactiveSetupProgressIndicator');
  }

  /**
   * Opens the wizard with the verification code already supplied, which is what the link Kibana
   * prints on first boot does. Without it the wizard would first ask the user to type the code in.
   */
  async goto(verificationCode: string) {
    await this.page.goto(this.kbnUrl.get('/', { params: { code: verificationCode } }));
    await this.enrollmentTokenInput.waitFor({ state: 'visible' });
  }

  async submitEnrollmentToken(enrollmentToken: string) {
    await this.enrollmentTokenInput.fill(enrollmentToken);
    await this.submitEnrollmentTokenButton.click();
  }

  /** Leaves the enrollment-token screen for the cluster-address screen. */
  async configureManually() {
    await this.configureManuallyButton.click();
    await this.clusterAddressInput.waitFor({ state: 'visible' });
  }

  /**
   * Submits the cluster address. Kibana pings it and then renders the configuration screen, whose
   * fields depend on what the cluster reports, so callers wait on the field they need next.
   */
  async checkClusterAddress(host: string) {
    await this.clusterAddressInput.fill(host);
    await this.checkAddressButton.click();
    await this.submitConfigurationButton.waitFor({ state: 'visible' });
  }

  async setCredentials(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
  }

  /**
   * Ticks the "I recognize and trust this certificate" card, which is what puts the cluster's CA
   * into the `configure` request. Only rendered when the cluster is served over TLS.
   */
  async trustCaCertificate() {
    await this.trustCaCertCheckbox.check();
  }

  async submitConfiguration() {
    await this.submitConfigurationButton.click();
  }

  /**
   * Waits for the wizard to accept a submission and move to its completion screen.
   *
   * `app.tsx` keeps every form mounted and toggles them with `hidden`, so no form or button is ever
   * detached and the submit buttons of two different screens coexist in the DOM. The unambiguous
   * success signal is the progress indicator, which is only rendered once the app reaches
   * `page === 'success'`; from there it polls until Kibana is past `preboot`.
   *
   * The timeout is explicit because interactive setup writes the Elasticsearch connection to disk
   * and restarts Kibana, which takes well over a minute.
   */
  async waitForSetupToComplete(timeoutMs: number) {
    await this.progressIndicator.waitFor({ state: 'visible', timeout: timeoutMs });
  }

  /** True when the configuration screen is asking for Elasticsearch credentials. */
  async hasCredentialsFields(): Promise<boolean> {
    return this.usernameInput.isVisible();
  }

  /** True when the configuration screen is offering the cluster's certificate authority to trust. */
  async hasCaCertificateField(): Promise<boolean> {
    return this.trustCaCertCheckbox.isVisible();
  }
}
