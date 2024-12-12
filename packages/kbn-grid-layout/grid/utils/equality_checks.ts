/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayoutData, GridPanelData } from '../types';

export const isGridDataEqual = (a?: GridPanelData, b?: GridPanelData) => {
  return (
    a?.id === b?.id &&
    a?.column === b?.column &&
    a?.row === b?.row &&
    a?.width === b?.width &&
    a?.height === b?.height
  );
};

export const isLayoutEqual = (a: GridLayoutData, b: GridLayoutData) => {
  if (a.length !== b.length) return false;

  let isEqual = true;
  for (let rowIndex = 0; rowIndex < a.length && isEqual; rowIndex++) {
    const rowA = a[rowIndex];
    const rowB = b[rowIndex];

    isEqual =
      rowA.title === rowB.title &&
      rowA.isCollapsed === rowB.isCollapsed &&
      Object.keys(rowA.panels).length === Object.keys(rowB.panels).length;

    if (isEqual) {
      for (const panelKey of Object.keys(rowA.panels)) {
        isEqual = isGridDataEqual(rowA.panels[panelKey], rowB.panels[panelKey]);
        if (!isEqual) break;
      }
    }
  }

  return isEqual;
};
