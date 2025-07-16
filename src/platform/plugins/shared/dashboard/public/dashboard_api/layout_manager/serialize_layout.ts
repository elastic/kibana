/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DashboardState, prefixReferencesFromPanel } from '../../../common';
import type { DashboardChildState, DashboardLayout } from './types';
import type { DashboardSection } from '../../../server';

export function serializeLayout(
  layout: DashboardLayout,
  childState: DashboardChildState
): Pick<DashboardState, 'panels' | 'references'> {
  const sections: { [sectionId: string]: DashboardSection } = {};
  Object.entries(layout.sections).forEach(([sectionId, sectionState]) => {
    sections[sectionId] = { ...sectionState, panels: [] };
  });

  const references: DashboardState['references'] = [];
  const panels: DashboardState['panels'] = [];
  Object.entries(layout.panels).forEach(([panelId, { gridData, type }]) => {
    const panelConfig = childState[panelId]?.rawState ?? {};
    references.push(...prefixReferencesFromPanel(panelId, childState[panelId]?.references ?? []));

    const { sectionId, ...restOfGridData } = gridData; // drop section ID
    const panelState = {
      type,
      gridData: restOfGridData,
      panelIndex: panelId,
      panelConfig,
    };

    if (sectionId) {
      sections[sectionId].panels.push(panelState);
    } else {
      panels.push(panelState);
    }
  });

  return {
    panels: [...panels, ...Object.values(sections)],
    references,
  };
}