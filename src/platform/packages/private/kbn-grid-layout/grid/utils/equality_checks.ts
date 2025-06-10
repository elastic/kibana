/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GridPanelData } from '../grid_panel';
import type { GridLayoutData, OrderedLayout } from '../types';

export const isGridDataEqual = (a?: GridPanelData, b?: GridPanelData) => {
  return (
    a?.id === b?.id &&
    a?.column === b?.column &&
    a?.row === b?.row &&
    a?.width === b?.width &&
    a?.height === b?.height
  );
};

export const isOrderedSectionEqual = (a?: OrderedLayout[string], b?: OrderedLayout[string]) => {
  if (!a || !b) {
    return a === b; // early return for if one grid section is undefined
  }
  let isEqual =
    a.id === b.id &&
    a.order === b.order &&
    Object.keys(a.panels).length === Object.keys(b.panels).length;
  if (a.isMainSection && b.isMainSection) {
    isEqual = isEqual && a.order === b.order;
  } else if (!(a.isMainSection || b.isMainSection)) {
    isEqual = isEqual && a.isCollapsed === b.isCollapsed && a.title === b.title;
  } else {
    return false;
  }
  for (const panelKey of Object.keys(a.panels)) {
    if (!isEqual) break;
    isEqual = isGridDataEqual(a.panels[panelKey], b.panels[panelKey]);
  }
  return isEqual;
};

export const isOrderedLayoutEqual = (a: OrderedLayout, b: OrderedLayout) => {
  if (Object.keys(a).length !== Object.keys(b).length) return false;
  let isEqual = true;
  const sections = Object.keys(a); // keys of A are equal to keys of B
  for (const sectionId of sections) {
    const sectionA = a[sectionId];
    const sectionB = b[sectionId];
    isEqual = isOrderedSectionEqual(sectionA, sectionB);
    if (!isEqual) break;
  }
  return isEqual;
};

export const isLayoutEqual = (a: GridLayoutData, b: GridLayoutData) => {
  if (Object.keys(a).length !== Object.keys(b).length) return false;
  let isEqual = true;
  const keys = Object.keys(a); // keys of A are equal to keys of B
  for (const key of keys) {
    const widgetA = a[key];
    const widgetB = b[key];
    if (!widgetA || !widgetB) return widgetA === widgetB;

    if (widgetA.type === 'panel' && widgetB.type === 'panel') {
      isEqual = isGridDataEqual(widgetA, widgetB);
    } else if (widgetA.type === 'section' && widgetB.type === 'section') {
      isEqual =
        widgetA.row === widgetB.row &&
        widgetA.title === widgetB.title &&
        widgetA.isCollapsed === widgetB.isCollapsed &&
        Object.keys(widgetA.panels).length === Object.keys(widgetB.panels).length;

      for (const panelKey of Object.keys(widgetA.panels)) {
        if (!isEqual) break;
        isEqual = isGridDataEqual(widgetA.panels[panelKey], widgetB.panels[panelKey]);
      }
    } else {
      isEqual = widgetA.row === widgetB.row;
    }
    if (!isEqual) break;
  }
  return isEqual;
};
