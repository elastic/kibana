/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { subj } from '@kbn/test-subj-selector';
import { ToolingLog } from '@kbn/tooling-log';
import { Page } from 'playwright';

interface WaitForRenderArgs {
  expectedItemsCount: number;
  itemLocator: string;
  checkAttribute: string;
}

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

  async backToDashboardListing() {
    await this.page.click(subj('breadcrumb dashboardListingBreadcrumb first'));
  }

  async waitForRender({ expectedItemsCount, itemLocator, checkAttribute }: WaitForRenderArgs) {
    try {
      await this.page.waitForFunction(
        function renderCompleted(args: WaitForRenderArgs) {
          const renderingItems = Array.from(document.querySelectorAll(args.itemLocator));
          const allItemsLoaded = renderingItems.length === args.expectedItemsCount;
          return allItemsLoaded
            ? renderingItems.every((e) => e.getAttribute(args.checkAttribute) === 'true')
            : false;
        },
        { expectedItemsCount, itemLocator, checkAttribute }
      );
    } catch (err) {
      const loaded = await this.page.$$(itemLocator);
      const rendered = await this.page.$$(`${itemLocator}[${checkAttribute}="true"]`);
      this.log.error(
        `'waitForRendering' failed: loaded - ${loaded.length}, rendered - ${rendered.length}, expected count - ${expectedItemsCount}`
      );
      throw err;
    }
  }

  async waitForVisualizations(count: number) {
    await this.waitForRender({
      expectedItemsCount: count,
      itemLocator: '[data-rendering-count]',
      checkAttribute: 'data-render-complete',
    });
  }

  async waitForCharts(count: number) {
    await this.waitForRender({
      expectedItemsCount: count,
      itemLocator: '.echChartStatus',
      checkAttribute: 'data-ech-render-complete',
    });
  }

  async clearInput(locator: string) {
    const textArea = this.page.locator(locator);
    await textArea.clear();
  }

  async clickAndWaitFor(
    locator: string,
    state?: 'attached' | 'detached' | 'visible' | 'hidden' | undefined
  ) {
    const element = this.page.locator(locator);
    await element.click();
    await element.waitFor({ state });
  }
}
