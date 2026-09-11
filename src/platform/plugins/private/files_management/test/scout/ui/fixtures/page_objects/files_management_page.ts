/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/** Page object for the Files management UI (Stack Management > Files). */
export class FilesManagementPage {
  public readonly app: Locator;
  public readonly diagnosticsButton: Locator;
  public readonly diagnosticsFlyout: Locator;

  constructor(private readonly page: ScoutPage) {
    this.app = this.page.testSubj.locator('filesManagementApp');
    this.diagnosticsButton = this.page.testSubj.locator(
      'filesManagementOpenDiagnosticsFlyoutButton'
    );
    this.diagnosticsFlyout = this.page.testSubj.locator('diagnosticsFlyout');
  }

  async goto(): Promise<void> {
    // Files management is a management section app, not a top-level one.
    await this.page.gotoApp('management/kibana/filesManagement');
    await this.app.waitFor({ state: 'visible' });
  }

  async openDiagnosticsFlyout(): Promise<void> {
    await this.diagnosticsButton.click();
    await this.diagnosticsFlyout.waitFor({ state: 'visible' });
  }
}
