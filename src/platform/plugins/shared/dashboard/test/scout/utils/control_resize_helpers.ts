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

export interface SavedPinnedControl {
  width?: string;
  grow?: boolean;
  config: { title?: string };
}

/** The flex panel (list item) that wraps the control with the given title. */
export const getControlPanel = (page: ScoutPage, title: string): Locator =>
  page.getByRole('listitem').filter({
    has: page.testSubj.locator('control-frame'),
    hasText: title,
  });

/** The rendered bounding box of a control panel; throws when it is not rendered. */
export const getControlPanelBox = async (panel: Locator): Promise<Box> => {
  const box = await panel.boundingBox();
  if (!box) throw new Error('The control panel is not rendered');
  return box;
};

/**
 * Drags the resize handle of a control panel horizontally with the real mouse, so the browser's
 * own flex layout (growth, wrapping, handle position) decides the geometry that gets committed.
 * The pointer moves in steps so that the layout reflows between events, like a real drag.
 */
export const dragControlResizeHandle = async (
  page: ScoutPage,
  panel: Locator,
  deltaX: number
): Promise<void> => {
  const handle = panel.getByRole('button', { name: 'Resize panel' });
  await handle.waitFor({ state: 'visible' });
  const handleBox = await getControlPanelBox(handle);

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  const steps = 10;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let step = 1; step <= steps; step++) {
    await page.mouse.move(startX + (deltaX * step) / steps, startY);
  }
  await page.mouse.up();
};

/** Reads the pinned controls that are persisted for a dashboard through the dashboard API. */
export const getSavedPinnedControls = async (
  kbnClient: KbnClient,
  spaceId: string,
  dashboardId: string
): Promise<SavedPinnedControl[]> => {
  const response = await kbnClient.request<{ data: { pinned_panels?: SavedPinnedControl[] } }>({
    method: 'GET',
    path: `/s/${spaceId}/${DASHBOARD_API_PATH}/${dashboardId}`,
    headers: { 'elastic-api-version': DASHBOARD_API_VERSION },
  });
  return response.data.data.pinned_panels ?? [];
};
