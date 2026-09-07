/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compressToEncodedURIComponent } from 'lz-string';
import type { Locator, ScoutPage } from '@kbn/scout';

export class ConsolePage {
  public readonly inputEditor: Locator;
  public readonly outputEditor: Locator;
  public readonly sendRequestButton: Locator;
  public readonly copyOutputButton: Locator;
  public readonly responseStatusBadge: Locator;

  constructor(private readonly page: ScoutPage) {
    this.inputEditor = this.page.testSubj.locator('consoleMonacoEditor');
    this.outputEditor = this.page.testSubj.locator('consoleMonacoOutput');
    this.sendRequestButton = this.page.testSubj.locator('sendRequestButton');
    this.copyOutputButton = this.page.testSubj.locator('copyOutputButton');
    this.responseStatusBadge = this.page.testSubj.locator('consoleResponseStatusBadge');
  }

  /**
   * Opens Console with the given request preloaded through the `load_from`
   * data-URI parameter (the "Open in Console" deep-link mechanism). This avoids
   * typing into Monaco, which is flaky under autocomplete. The appended request
   * receives the cursor, so the send button becomes available.
   */
  async gotoWithRequestLoaded(request: string) {
    const encoded = compressToEncodedURIComponent(request);
    await this.page.gotoApp('dev_tools', {
      hash: `console?load_from=data:text/plain,${encoded}`,
    });
    await this.inputEditor.waitFor({ state: 'visible' });
    await this.sendRequestButton.waitFor({ state: 'visible' });
  }

  async sendRequest() {
    await this.sendRequestButton.click();
    await this.responseStatusBadge.waitFor({ state: 'visible' });
  }

  async selectOutput() {
    await this.focusEditor(this.outputEditor);
    await this.copyOutputButton.waitFor({ state: 'visible' });
  }

  /**
   * Presses the copy-output button with a human-speed click: mouse down, hold,
   * then release. Regression guard for the blur-hide race where the editor blur
   * (triggered by the button's mousedown) hid the button 100ms later, so clicks
   * held longer than ~100ms released over a hidden element and never fired.
   * Fast synthetic clicks win that race and cannot detect the bug.
   * See https://github.com/elastic/kibana/issues/266698.
   */
  async slowClickCopyOutput(holdMs: number) {
    await this.copyOutputButton.click({ delay: holdMs });
  }

  /**
   * Focuses a Monaco editor by clicking its line-number margin. Clicking the
   * editor container itself does not reliably focus Monaco (its overlay layers
   * intercept pointer events), so this mirrors the FTR Console page object.
   */
  private async focusEditor(editor: Locator) {
    await editor.locator('.margin-view-overlays').click();
  }
}
