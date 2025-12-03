/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';

export class Inspector {
  constructor(private readonly page: ScoutPage) {}

  async open() {
    await this.page.testSubj.click('openInspectorButton');
    await this.page.testSubj.waitForSelector('inspectorPanel', { state: 'visible' });
  }

  async close() {
    await this.page.testSubj.click('euiFlyoutCloseButton');
    await this.page.testSubj.waitForSelector('inspectorPanel', { state: 'hidden' });
  }

  async getRequestTimestamp(): Promise<string> {
    await this.page.testSubj.waitForSelector('inspectorPanel', { state: 'visible' });
    return await this.page.testSubj.locator('inspector.statistics.requestTimestamp').innerText();
  }
}
