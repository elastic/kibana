/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
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
  if (!deepEqual(Object.keys(a), Object.keys(b))) return false;

  let isEqual = true;
  const keys = Object.keys(a); // keys of A are equal to keys of b
  for (const key of keys) {
    const widgetA = a[key];
    const widgetB = b[key];

    if (widgetA.type === 'panel' && widgetB.type === 'panel') {
      isEqual = isGridDataEqual(widgetA, widgetB);
    } else {
      isEqual =
        widgetA.row === widgetB.row &&
        (widgetA.type === 'section' && widgetB.type === 'section'
          ? widgetA.title === widgetB.title &&
            widgetA.isCollapsed === widgetB.isCollapsed &&
            Object.keys(widgetA.panels).length === Object.keys(widgetB.panels).length
          : true);

      if (isEqual && widgetA.type === 'section' && widgetB.type === 'section') {
        for (const panelKey of Object.keys(widgetA.panels)) {
          isEqual = isGridDataEqual(widgetA.panels[panelKey], widgetB.panels[panelKey]);
          if (!isEqual) break;
        }
      }
    }
    if (!isEqual) break;
  }

  return isEqual;
};
