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
import type { DashboardAttributes, DashboardPanel, DashboardSection } from '../../types';
import { getReferencesForPanelId } from '../../../../../common';
import { embeddableService, logger } from '../../../../kibana_services';

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
    grid: rest,
    config: transformedPanelConfig ? transformedPanelConfig : config,
    uid: panelIndex,
    type: panelType,
    version,
  };
}
