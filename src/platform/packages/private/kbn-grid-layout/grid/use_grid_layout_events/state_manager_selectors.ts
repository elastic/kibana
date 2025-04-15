/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { GridLayoutData, GridLayoutStateManager, GridRowData } from '../types';

export const isLayoutInteractive = (gridLayoutStateManager: GridLayoutStateManager) => {
  return (
    gridLayoutStateManager.expandedPanelId$.value === undefined &&
    gridLayoutStateManager.accessMode$.getValue() === 'EDIT'
  );
};

export const hasPanelInteractionStartedWithKeyboard = (manager: GridLayoutStateManager) =>
  manager.interactionEvent$.value?.sensorType === 'keyboard';

export const hasRowInteractionStartedWithKeyboard = (manager: GridLayoutStateManager) =>
  manager.activeRowEvent$.value?.sensorType === 'keyboard';

export const createNewRow = ({
  id = uuidv4(),
  ...overrides
}: Partial<GridRowData>): GridRowData => ({
  id,
  order: -1,
  isCollapsible: false,
  isCollapsed: false,
  panels: {},
  title: ' ',
  ...overrides,
});

export function normalizeOrder(obj: GridLayoutData) {
  const entries = Object.entries(obj);

  // Sort by current order
  entries.sort(([, a], [, b]) => a.order - b.order);

  // Reassign order incrementally
  entries.forEach(([, section], index) => {
    section.order = index;
  });

  return Object.fromEntries(entries);
}
