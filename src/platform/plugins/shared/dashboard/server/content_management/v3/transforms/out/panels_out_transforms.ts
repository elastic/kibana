/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedDashboardPanel, SavedDashboardSection } from '../../../../dashboard_saved_object';
import { DashboardAttributes, DashboardPanel, DashboardSection } from '../../types';

export function transformPanelsOut(
  panelsJSON: string = '{}',
  sections: SavedDashboardSection[] = []
): DashboardAttributes['panels'] {
  const panels = JSON.parse(panelsJSON);
  const sectionsMap: { [uuid: string]: DashboardPanel | DashboardSection } = sections.reduce(
    (prev, section) => {
      const sectionId = section.gridData.i;
      return { ...prev, [sectionId]: { ...section, panels: [] } };
    },
    {}
  );
  panels.forEach((panel: SavedDashboardPanel) => {
    const { sectionId } = panel.gridData;
    if (sectionId) {
      (sectionsMap[sectionId] as DashboardSection).panels.push(transformPanelProperties(panel));
    } else {
      sectionsMap[panel.panelIndex] = transformPanelProperties(panel);
    }
  });
  return Object.values(sectionsMap);
}

function transformPanelProperties({
  embeddableConfig,
  gridData,
  id,
  panelIndex,
  panelRefName,
  title,
  type,
  version,
}: SavedDashboardPanel) {
  const { sectionId, ...rest } = gridData; // drop section ID, if it exists
  return {
    gridData: rest,
    id,
    panelConfig: embeddableConfig,
    panelIndex,
    panelRefName,
    title,
    type,
    version,
  };
}
