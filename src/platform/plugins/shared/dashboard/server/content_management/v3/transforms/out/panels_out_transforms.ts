/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectReference } from '@kbn/core/server';
import { SavedDashboardPanel, SavedDashboardSection } from '../../../../dashboard_saved_object';
import { DashboardAttributes, DashboardPanel, DashboardSection } from '../../types';
import { getReferencesForPanelId } from '../../../../../common/dashboard_container/persistable_state/dashboard_container_references';

export function transformPanelsOut(
  panelsJSON: string = '{}',
  sections: SavedDashboardSection[] = [],
  references?: SavedObjectReference[]
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
    const filteredReferences = getReferencesForPanelId(panel.panelIndex, references ?? []);
    const panelReferences = filteredReferences.length === 0 ? references : filteredReferences;
    const { sectionId } = panel.gridData;
    if (sectionId) {
      (sectionsMap[sectionId] as DashboardSection).panels.push(
        transformPanelProperties(panel, panelReferences)
      );
    } else {
      sectionsMap[panel.panelIndex] = transformPanelProperties(panel, panelReferences);
    }
  });
  return Object.values(sectionsMap);
}

function transformPanelProperties(
  {
    embeddableConfig,
    gridData,
    id,
    panelIndex,
    panelRefName,
    title,
    type,
    version,
  }: SavedDashboardPanel,
  references?: SavedObjectReference[]
) {
  const { sectionId, ...rest } = gridData; // drop section ID, if it exists

  const matchingReference =
    panelRefName && references
      ? references.find((reference) => reference.name === panelRefName)
      : undefined;

  return {
    gridData: rest,
    id: matchingReference ? matchingReference.id : id,
    panelConfig: embeddableConfig,
    panelIndex,
    panelRefName,
    title,
    type: matchingReference ? matchingReference.type : type,
    version,
  };
}
