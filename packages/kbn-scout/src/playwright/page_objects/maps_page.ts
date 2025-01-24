/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { retryForSuccess } from '@kbn/ftr-common-functional-services';
import { ToolingLog } from '@kbn/tooling-log';
import { ScoutPage } from '..';

const RENDER_COMPLETE_SELECTOR = '[data-render-complete="true"]';
const RENDER_COMPLETE_PENDING_SELECTOR = '[data-render-complete="false"]';
const DATA_LOADING_SELECTOR = '[data-loading]';

export class MapsPage {
  constructor(private readonly page: ScoutPage, private readonly log: ToolingLog) {}

  async goto() {
    await this.page.gotoApp('maps');
  }

  async waitForRender(count: number = 1): Promise<void> {
    await retryForSuccess(this.log, {
      retryCount: 10,
      timeout: 10_000,
      methodName: 'waitForRender()',
      block: async () => {
        const renderCompleteLocator = this.page.locator(RENDER_COMPLETE_SELECTOR);
        const renderPendingDataTitleLocator = this.page
          .locator(RENDER_COMPLETE_PENDING_SELECTOR)
          .and(this.page.locator('data-title'));
        const loadingLocator = this.page.locator(DATA_LOADING_SELECTOR);

        await renderCompleteLocator.waitFor({ timeout: 1000 });
        const completedElementsCount = await renderCompleteLocator.count();

        if (completedElementsCount < count) {
          const pendingTitles = await renderPendingDataTitleLocator.all();
          throw new Error(
            `${completedElementsCount} elements completed rendering, still waiting on a total of ${count} - ${pendingTitles}`
          );
        }

        const loadingCount = await loadingLocator.count();
        if (loadingCount > 0) throw new Error(`${loadingCount} elements still loading contents`);
      },
    });
  }
}
