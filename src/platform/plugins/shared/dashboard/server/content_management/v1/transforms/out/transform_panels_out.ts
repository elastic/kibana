/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type {
  SavedDashboardPanel,
  SavedDashboardSection,
} from '../../../../dashboard_saved_object';
import type { DashboardState, DashboardPanel, DashboardSection } from '../../types';
import { getReferencesForPanelId } from '../../../../../common';
import { embeddableService, logger } from '../../../../kibana_services';

export function transformPanelsOut(
  panelsJSON: string = '{}',
  sections: SavedDashboardSection[] = [],
  references?: SavedObjectReference[]
): DashboardState['panels'] {
  const topLevelPanels: DashboardPanel[] = [];
  const sectionsMap: { [uuid: string]: DashboardSection } = {};
  sections.forEach((section) => {
    const { gridData: grid, ...restOfSection } = section;
    const { i: sectionId, ...restOfGrid } = grid;
    sectionsMap[sectionId] = {
      ...restOfSection,
      grid: restOfGrid,
      panels: [],
      uid: sectionId,
    };
  });

  JSON.parse(panelsJSON).forEach((panel: SavedDashboardPanel) => {
    const filteredReferences = getReferencesForPanelId(panel.panelIndex, references ?? []);
    const panelReferences = filteredReferences.length === 0 ? references : filteredReferences;
    const { sectionId } = panel.gridData;
    if (sectionId) {
      sectionsMap[sectionId].panels.push(transformPanelProperties(panel, panelReferences));
    } else {
      topLevelPanels.push(transformPanelProperties(panel, panelReferences));
    }
  });
  return [...topLevelPanels, ...Object.values(sectionsMap)];
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
  const { sectionId, i, ...restOfGrid } = gridData;

  const matchingReference =
    panelRefName && references
      ? references.find((reference) => reference.name === panelRefName)
      : undefined;

  const storedSavedObjectId = id ?? embeddableConfig.savedObjectId;
  const savedObjectId = matchingReference ? matchingReference.id : storedSavedObjectId;
  const panelType = matchingReference ? matchingReference.type : type;

  const transforms = embeddableService?.getTransforms(panelType);

  const config = {
    ...embeddableConfig,
    // <8.19 savedObjectId and title stored as siblings to embeddableConfig
    ...(savedObjectId !== undefined && { savedObjectId }),
    ...(title !== undefined && { title }),
  };

  let transformedPanelConfig;
  try {
    if (transforms?.transformOut) {
      transformedPanelConfig = transforms.transformOut(config, references);
    }
  } catch (transformOutError) {
    // do not prevent read on transformOutError
    logger.warn(
      `Unable to transform "${panelType}" embeddable state on read. Error: ${transformOutError.message}`
    );
  }

  return {
    grid: restOfGrid,
    config: transformedPanelConfig ? transformedPanelConfig : config,
    uid: panelIndex,
    type: panelType,
    ...(version && { version }),
  };
}
