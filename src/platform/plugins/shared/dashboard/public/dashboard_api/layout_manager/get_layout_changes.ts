/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { arePanelLayoutsEqual, arePinnedPanelLayoutsEqual } from './are_layouts_equal';
import type { DashboardLayout } from './types';

/**
 * Whether the panels and the pinned panels changed from `baselineLayout` to `currentLayout`,
 * either in their layout or because `isPanelChanged` reports a panel of the current layout.
 */
export const getLayoutChanges = (
  baselineLayout: DashboardLayout,
  currentLayout: DashboardLayout,
  isPanelChanged: (panelId: string) => boolean
): { hasPanelChanges: boolean; hasPinnedPanelChanges: boolean } => ({
  hasPanelChanges:
    !arePanelLayoutsEqual(baselineLayout, currentLayout) ||
    Object.keys(currentLayout.panels).some(isPanelChanged),
  hasPinnedPanelChanges:
    !arePinnedPanelLayoutsEqual(baselineLayout, currentLayout) ||
    Object.keys(currentLayout.pinnedPanels).some(isPanelChanged),
});
