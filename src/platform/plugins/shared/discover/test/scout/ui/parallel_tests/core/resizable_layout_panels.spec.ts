/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover resizable layout panels: dragging the histogram and sidebar
 * resize handles should grow/shrink the adjacent panels symmetrically.
 * Migrated from the "resizable layout panels" describe in
 * `src/platform/test/functional/apps/discover/group1/_discover.ts`.
 *
 * The drag distance (100 px) is small enough to stay within the panel's
 * configured min/max bounds so an exact pixel assertion is safe.
 */

import { spaceTest, tags, type Locator, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const RESIZE_DISTANCE = 100;

const dragBy = async (page: ScoutPage, handle: Locator, dx: number, dy: number) => {
  const box = await handle.boundingBox();
  if (!box) {
    throw new Error('resize handle has no bounding box');
  }
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Move in two steps so the resize observer registers the drag rather
  // than treating it as a click.
  await page.mouse.move(startX + dx / 2, startY + dy / 2, { steps: 5 });
  await page.mouse.move(startX + dx, startY + dy, { steps: 5 });
  await page.mouse.up();
};

const heightOf = async (locator: Locator): Promise<number> => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('locator has no bounding box');
  return box.height;
};

const widthOf = async (locator: Locator): Promise<number> => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('locator has no bounding box');
  return box.width;
};

spaceTest.describe('Discover - resizable layout panels', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('resizes the histogram panels', async ({ page }) => {
    const topPanel = page.testSubj.locator('unifiedHistogramResizablePanelFixed');
    const mainPanel = page.testSubj.locator('unifiedHistogramResizablePanelFlex');
    const handle = page.testSubj.locator('unifiedHistogramResizableButton');

    await expect(topPanel).toBeVisible();
    await expect(mainPanel).toBeVisible();
    await expect(handle).toBeVisible();

    const topBefore = await heightOf(topPanel);
    const mainBefore = await heightOf(mainPanel);

    await dragBy(page, handle, 0, RESIZE_DISTANCE);

    await expect.poll(() => heightOf(topPanel)).toBe(topBefore + RESIZE_DISTANCE);
    expect(await heightOf(mainPanel)).toBe(mainBefore - RESIZE_DISTANCE);
  });

  spaceTest('resizes the sidebar panels', async ({ page }) => {
    const leftPanel = page.testSubj.locator('discoverLayoutResizablePanelFixed');
    const mainPanel = page.testSubj.locator('discoverLayoutResizablePanelFlex');
    const handle = page.testSubj.locator('discoverLayoutResizableButton');

    await expect(leftPanel).toBeVisible();
    await expect(mainPanel).toBeVisible();
    await expect(handle).toBeVisible();

    const leftBefore = await widthOf(leftPanel);
    const mainBefore = await widthOf(mainPanel);

    await dragBy(page, handle, RESIZE_DISTANCE, 0);

    await expect.poll(() => widthOf(leftPanel)).toBe(leftBefore + RESIZE_DISTANCE);
    expect(await widthOf(mainPanel)).toBe(mainBefore - RESIZE_DISTANCE);
  });
});
