/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../../common/constants';
import type { PanelJsonEntry } from './types';

/** A panel entry that may not have a grid yet, such as a panel that isn't on a dashboard. */
export type PanelJsonEntryWithOptionalGrid = Omit<PanelJsonEntry, 'grid'> &
  Partial<Pick<PanelJsonEntry, 'grid'>>;

/**
 * Builds Dashboards API panel entries that keep each panel's position on its dashboard. Panels
 * without a grid get the default size.
 */
export const buildPanelJsonEntries = (panels: PanelJsonEntryWithOptionalGrid[]): PanelJsonEntry[] =>
  panels.map(({ type, grid, config }) => ({
    type,
    grid: grid
      ? { x: grid.x, y: grid.y, w: grid.w, h: grid.h }
      : { x: 0, y: 0, w: DEFAULT_PANEL_WIDTH, h: DEFAULT_PANEL_HEIGHT },
    config,
  }));
