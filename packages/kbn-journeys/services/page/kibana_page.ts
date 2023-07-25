/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { Page } from 'playwright';

export class KibanaPage {
  readonly page: Page;
  readonly log: ToolingLog;

  constructor(page: Page, log: ToolingLog) {
    this.page = page;
    this.log = log;
  }

  async waitForHeader() {
    return this.page.waitForSelector('.headerGlobalNav', {
      state: 'attached',
    });
  }

  async waitForVisualizations(visCount: number) {
    try {
      await this.page.waitForFunction(function renderCompleted(cnt) {
        const visualizations = Array.from(document.querySelectorAll('[data-rendering-count]'));
        const allVisLoaded = visualizations.length === cnt;
        return allVisLoaded
          ? visualizations.every((e) => e.getAttribute('data-render-complete') === 'true')
          : false;
      }, visCount);
    } catch (err) {
      const loadedVis = await this.page.$$('[data-rendering-count]');
      const renderedVis = await this.page.$$('[data-rendering-count][data-render-complete="true"]');
      this.log.error(
        `'waitForVisualizations' failed: loaded - ${loadedVis.length}, rendered - ${renderedVis.length}, expected - ${visCount}`
      );
      throw err;
    }
  }
}
