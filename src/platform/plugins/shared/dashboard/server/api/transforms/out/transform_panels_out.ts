/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import type { SavedDashboardPanel, SavedDashboardSection } from '../../../dashboard_saved_object';
import type { DashboardState, DashboardPanel, DashboardSection } from '../../types';
import { embeddableService, logger } from '../../../kibana_services';
import { getPanelReferences } from './get_panel_references';
import { panelBwc } from './panel_bwc';

export function transformPanelsOut(
  panelsJSON: string = '[]',
  sections: SavedDashboardSection[] = [],
  containerReferences?: SavedObjectReference[]
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
    const panelReferences = getPanelReferences(containerReferences ?? [], panel);
    const { sectionId } = panel.gridData;
    if (sectionId) {
      sectionsMap[sectionId].panels.push(
        transformPanelProperties(panel, panelReferences, containerReferences)
      );
    } else {
      topLevelPanels.push(transformPanelProperties(panel, panelReferences, containerReferences));
    }
  });
  return [...topLevelPanels, ...Object.values(sectionsMap)];
}

const defaultTransform = (
  config: SavedDashboardPanel['embeddableConfig']
): SavedDashboardPanel['embeddableConfig'] => transformTitlesOut(config);

function transformPanelProperties(
  storedPanel: SavedDashboardPanel,
  storedPanelReferences?: SavedObjectReference[],
  containerReferences?: SavedObjectReference[]
) {
  const { panel, panelReferences } = panelBwc(storedPanel, storedPanelReferences ?? []);
  const { embeddableConfig, gridData, panelIndex, type, version } = panel;

  const { sectionId, i, ...restOfGrid } = gridData;

  const transforms = embeddableService?.getTransforms(type);

  let transformedPanelConfig;
  try {
    transformedPanelConfig =
      transforms?.transformOut?.(embeddableConfig, panelReferences, containerReferences) ??
      defaultTransform(embeddableConfig);
  } catch (transformOutError) {
    // do not prevent read on transformOutError
    logger.warn(
      `Unable to transform "${type}" embeddable state on read. Error: ${transformOutError.message}`
    );
  }

  return {
    grid: restOfGrid,
    config: transformedPanelConfig ? transformedPanelConfig : embeddableConfig,
    uid: panelIndex,
    type,
    ...(version && { version }),
  };
}
