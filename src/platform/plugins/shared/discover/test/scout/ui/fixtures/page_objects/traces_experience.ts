/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';

export class TracesExperiencePage {
  public readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(
    private readonly page: ScoutPage,
    private readonly discover: PageObjects['discover']
  ) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async setEsqlQuery(query: string) {
    await this.codeEditor.setCodeEditorValue(query);
  }

  async submitQuery() {
    await this.page.testSubj.click('querySubmitButton');
  }

  async switchToEsql() {
    const btn = this.page.testSubj.locator('select-text-based-language-btn');
    if (await btn.isEnabled()) {
      await btn.click();
    }
  }

  async runEsqlQuery(query: string) {
    await this.switchToEsql();
    await this.setEsqlQuery(query);
    await this.submitQuery();
    await this.discover.waitUntilSearchingHasFinished();
  }
}
