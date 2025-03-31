/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutPage } from '..';


export class PainlessLab {
  public outputValueElement: Locator;
  public requestFlyoutHeader: Locator;

  constructor(private readonly page: ScoutPage) {
    this.outputValueElement = this.page.testSubj.locator('painlessTabs');
    this.requestFlyoutHeader = this.page.testSubj.locator('painlessLabRequestFlyoutHeader');
  }

  async goto() {
    return this.page.gotoApp('dev_tools', { hash: 'painless_lab' });
  }

  async waitForRenderComplete() {
    // wait for page to be rendered
    await this.page.testSubj.locator('painless_lab').waitFor({ state: 'visible' });
  }

  async setCodeEditorValue(value: string, nthIndex?: number) {
    await this.page.evaluate(
      ([editorIndex, codeEditorValue]) => {
        // The monaco property is guaranteed to exist as it's value is provided in @kbn/monaco for this specific purpose, see {@link src/platform/packages/shared/kbn-monaco/src/register_globals.ts}
        const editor = window.MonacoEnvironment!.monaco!.editor;
        const textModels = editor.getModels();

        if (editorIndex !== undefined) {
          textModels[editorIndex].setValue(codeEditorValue);
        } else {
          // when specific model instance is unknown, update all models returned
          textModels.forEach((model) => model.setValue(codeEditorValue));
        }
      },
      [nthIndex, value]
    );
  }

  async clickShowApiRequest() {
    this.page.testSubj.locator('btnViewRequest').click();
  }

  async getFlyoutRequestBody() {
    return this.page.testSubj.locator('painlessLabFlyoutRequest').innerText();
  }

  async clickFlyoutResponseButton() {
    this.page.locator('#response').click();
  }

  async getFlyoutResponseBody() {
    const flyoutResponse = this.page.testSubj.locator('painlessLabFlyoutResponse');
    await flyoutResponse.waitFor({ state: 'visible' });
    return flyoutResponse.innerText();
  }
}
