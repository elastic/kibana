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
import { Retry } from '..';

interface WaitForRenderArgs {
  expectedItemsCount: number;
  itemLocator: string;
  checkAttribute: string;
  timeout: number;
}

export class KibanaPage {
  readonly page: Page;
  readonly log: ToolingLog;
  readonly retry: Retry;
  readonly defaultTimeout = 30_000;

  constructor(page: Page, log: ToolingLog, retry: Retry) {
    this.page = page;
    this.log = log;
    this.retry = retry;
  }

  async waitForHeader() {
    return this.page.waitForSelector('.headerGlobalNav', {
      state: 'attached',
    });
  }

  async backToDashboardListing() {
    await this.page.click(subj('breadcrumb dashboardListingBreadcrumb first'));
  }

  async waitForRender({
    expectedItemsCount,
    itemLocator,
    checkAttribute,
    timeout,
  }: WaitForRenderArgs) {
    // we can't use `page.waitForFunction` because of CSP while testing on Cloud
    await this.retry.waitForWithTimeout(
      `rendering of ${expectedItemsCount} elements with selector ${itemLocator} is completed`,
      timeout,
      async () => {
        const renderingItems = await this.page.$$(itemLocator);
        if (renderingItems.length === expectedItemsCount) {
          const renderStatuses = await Promise.all(
            renderingItems.map(async (item) => {
              return (await item.getAttribute(checkAttribute)) === 'true';
            })
          );
          const rendered = renderStatuses.filter((isRendered) => isRendered === true);
          this.log.debug(
            `waitForRender: ${rendered.length} out of ${expectedItemsCount} are rendered...`
          );
          return rendered.length === expectedItemsCount;
        } else {
          // not all components are loaded yet
          this.log.debug(
            `waitForRender: ${renderingItems.length} out of ${expectedItemsCount} are loaded...`
          );
          return false;
        }
      }
    );
  }

  async waitForVisualizations({
    count,
    timeout = this.defaultTimeout,
  }: {
    count: number;
    timeout?: number;
  }) {
    await this.waitForRender({
      expectedItemsCount: count,
      itemLocator: '[data-rendering-count]',
      checkAttribute: 'data-render-complete',
      timeout,
    });
  }

  async waitForCharts({
    count,
    timeout = this.defaultTimeout,
  }: {
    count: number;
    timeout?: number;
  }) {
    await this.waitForRender({
      expectedItemsCount: count,
      itemLocator: '.echChartStatus',
      checkAttribute: 'data-ech-render-complete',
      timeout,
    });
  }

  async waitForChartsSuggestions(count: number) {
    await this.retry.waitFor(`rendering of ${count} suggestions is completed`, async () => {
      const renderingItems = await this.page.$$('button[data-test-subj="lnsSuggestion"]');
      return renderingItems.length === count;
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
