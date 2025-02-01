/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutPage, expect } from '..';

export class RenderablePage {
  constructor(private readonly page: ScoutPage) {}

  async waitForRender(count: number = 1): Promise<void> {
    await expect(async () => await renderWait(count, this.page)).toPass({
      timeout: 10_000,
    });
  }
}

const RENDER_COMPLETE_SELECTOR = '[data-render-complete="true"]';
const RENDER_COMPLETE_PENDING_SELECTOR = '[data-render-complete="false"]';
const DATA_LOADING_SELECTOR = '[data-loading]';

async function renderWait(count: number, page: ScoutPage) {
  const renderCompleteLocator = page.locator(RENDER_COMPLETE_SELECTOR);
  const renderPendingDataTitleLocator = page
    .locator(RENDER_COMPLETE_PENDING_SELECTOR)
    .and(page.locator('data-title'));
  const loadingLocator = page.locator(DATA_LOADING_SELECTOR);

  await renderCompleteLocator.waitFor({ timeout: 1000 });
  const completedElementsCount = await renderCompleteLocator.count();

  if (completedElementsCount < count)
    throw new Error(
      `${completedElementsCount} elements completed rendering, still waiting on a total of ${count} - ${await renderPendingDataTitleLocator.all()}`
    );

  const loadingCount = await loadingLocator.count();
  if (loadingCount > 0) throw new Error(`${loadingCount} elements still loading contents`);
}
