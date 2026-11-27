/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from 'playwright-core';
import type { KbnClient, ScoutPage } from '@kbn/scout';
import { DASHBOARD_API_PATH, DASHBOARD_API_VERSION } from '@kbn/scout/constants';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SavedPinnedPanel {
  width?: string;
  grow?: boolean;
  config: { title?: string };
}

/** The flex panel (list item) that wraps the pinned panel with the given title. */
export const getPinnedPanel = (page: ScoutPage, title: string): Locator =>
  page.getByRole('listitem').filter({
    has: page.testSubj.locator('control-frame'),
    hasText: title,
  });

/** The rendered bounding box of a locator; throws when it is not rendered. */
export const getBox = async (locator: Locator): Promise<Box> => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('The element is not rendered');
  return box;
};

/**
 * Drags a pinned panel by its move handle with the real mouse and drops it on the left (`before`) or
 * right (`after`) half of the target pinned panel, which may be on another row. The layout picks the
 * row from the vertical position and the slot from the horizontal position of the dragged panel's
 * centre, so the pointer moves by the distance between the two panel centres plus the chosen offset.
 * The pointer moves in steps so that the layout reacts between events, like a real drag.
 */
export const dragPinnedPanelNextTo = async (
  page: ScoutPage,
  panel: Locator,
  target: Locator,
  placement: 'before' | 'after'
): Promise<void> => {
  const handle = panel.getByRole('button', { name: /^Move control/ });
  await handle.waitFor({ state: 'visible' });

  const [handleBox, panelBox, targetBox] = await Promise.all([
    getBox(handle),
    getBox(panel),
    getBox(target),
  ]);

  const targetCenterX = targetBox.x + targetBox.width * (placement === 'before' ? 0.25 : 0.75);
  const deltaX = targetCenterX - (panelBox.x + panelBox.width / 2);
  const deltaY = targetBox.y + targetBox.height / 2 - (panelBox.y + panelBox.height / 2);

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  const steps = 15;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let step = 1; step <= steps; step++) {
    await page.mouse.move(startX + (deltaX * step) / steps, startY + (deltaY * step) / steps);
  }
  await page.mouse.up();
};

/** Reads the pinned panels that are persisted for a dashboard through the dashboard API. */
export const getSavedPinnedPanels = async (
  kbnClient: KbnClient,
  spaceId: string,
  dashboardId: string
): Promise<SavedPinnedPanel[]> => {
  const response = await kbnClient.request<{ data: { pinned_panels?: SavedPinnedPanel[] } }>({
    method: 'GET',
    path: `/s/${spaceId}/${DASHBOARD_API_PATH}/${dashboardId}`,
    headers: { 'elastic-api-version': DASHBOARD_API_VERSION },
  });
  return response.data.data.pinned_panels ?? [];
};
