/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlexPanelData } from '../grid_panel';
import type { FlexLayoutData, FlexLayoutElementsInOrder } from '../types';

const comparePanel = (panelA: FlexPanelData, panelB: FlexPanelData, draggedId?: string) => {
  if (panelA.order > panelB.order) return 1;
  if (panelA.order < panelB.order) return -1;

  // if orders are the same. Is either panel being dragged?
  if (panelA.id === draggedId) return -1;
  if (panelB.id === draggedId) return 1;

  // fall back
  return 1;
};

export const getLayoutInOrder = (
  layout: FlexLayoutData,
  draggedId?: string
): FlexLayoutElementsInOrder => {
  const widgetIds = Object.keys(layout);
  const idsInorder = widgetIds.sort((widgetKeyA, widgetKeyB) => {
    const widgetA = layout[widgetKeyA];
    const widgetB = layout[widgetKeyB];
    return comparePanel(widgetA, widgetB, draggedId);
  });
  return idsInorder.map((id) => ({ id, type: layout[id].type }));
};

export const getPanelKeysInOrder = (panels: FlexLayoutData, draggedId?: string): string[] => {
  const panelKeys = Object.keys(panels);
  return panelKeys.sort((panelKeyA, panelKeyB) => {
    const panelA = panels[panelKeyA];
    const panelB = panels[panelKeyB];

    return comparePanel(panelA, panelB, draggedId);
  });
};
