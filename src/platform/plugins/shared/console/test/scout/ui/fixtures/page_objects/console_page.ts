/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class Console {
  public consoleSkipTourButton: Locator;
  public consoleMonacoEditor: Locator;

  constructor(private readonly page: ScoutPage) {
    this.consoleSkipTourButton = this.page.testSubj.locator('consoleSkipTourButton');
    this.consoleMonacoEditor = this.page.testSubj.locator('consoleMonacoEditor');
  }

  async goto() {
    await this.page.gotoApp('dev_tools', { hash: '/console/shell' });
    // I'd like to simplify this, not sure why something this complex is needed to ensure the page is ready
    await this.getEditorText();
  }

  public async clickSkipTour() {
    await this.consoleSkipTourButton.click();
  }

  async skipTourIfExists() {
    // not sure how long to wait for tour
    // would be better if we KNEW when the tour might appear
    await this.consoleSkipTourButton
      .waitFor({
        state: 'visible',
        timeout: 2000,
      })
      .catch(() => {
        return false;
      });

    const tourShown = await this.consoleSkipTourButton.isVisible().catch(() => false);

    if (tourShown) {
      await this.clickSkipTour();
    }
  }

  public async getEditorText() {
    const editorViewDiv = this.consoleMonacoEditor.locator('.view-lines');
    return await editorViewDiv.textContent();
  }

  public async isOutputPanelEmptyStateVisible() {
    return await this.page.testSubj.locator('consoleOutputPanelEmptyState').isVisible();
  }
}
