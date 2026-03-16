/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import { flow } from 'lodash';
import type { SavedDashboardPanel, SavedDashboardSection } from '../../../dashboard_saved_object';
import type { DashboardState, DashboardPanel, DashboardSection } from '../../types';
import { embeddableService, logger } from '../../../kibana_services';
import { getPanelReferences } from './get_panel_references';
import { panelBwc } from './panel_bwc';

export function transformPanelsOut(
  panelsJSON: string = '[]',
  sections: SavedDashboardSection[] = [],
  containerReferences?: SavedObjectReference[],
  isDashboardAppRequest: boolean = false
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
    const panelProperties = transformPanelProperties(
      panel,
      panelReferences,
      containerReferences,
      isDashboardAppRequest
    );

    if (sectionId) {
      if (!sectionsMap[sectionId]) {
        logger?.warn(`Panel references non-existent section "${sectionId}", treating as top-level`);
        topLevelPanels.push(panelProperties);
      } else {
        sectionsMap[sectionId].panels.push(panelProperties);
      }
    } else {
      topLevelPanels.push(panelProperties);
    }
  });
  return [...topLevelPanels, ...Object.values(sectionsMap)];
}

const defaultTransform = (
  config: SavedDashboardPanel['embeddableConfig']
): SavedDashboardPanel['embeddableConfig'] => {
  const transformsFlow = flow(transformTitlesOut, transformTimeRangeOut);
  return transformsFlow(config);
};

function transformPanelProperties(
  storedPanel: SavedDashboardPanel,
  storedPanelReferences?: SavedObjectReference[],
  containerReferences?: SavedObjectReference[],
  isDashboardAppRequest: boolean = false
) {
  const { panel, panelReferences } = panelBwc(storedPanel, storedPanelReferences ?? []);
  const { embeddableConfig, gridData, panelIndex, type } = panel;

  const { sectionId, i, ...restOfGrid } = gridData;

  // Temporary escape hatch for lens as code
  // TODO remove when lens as code transforms are ready for production
  const transformType = type === 'lens' && isDashboardAppRequest ? 'lens-dashboard-app' : type;
  const transforms = embeddableService?.getTransforms(transformType);

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
  };
}
