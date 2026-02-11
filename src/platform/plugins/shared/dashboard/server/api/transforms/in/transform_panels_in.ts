/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { v4 as uuidv4 } from 'uuid';

import type { SavedObjectReference } from '@kbn/core/server';
import { isDashboardSection, prefixReferencesFromPanel } from '../../../../common';
import type {
  DashboardSavedObjectAttributes,
  SavedDashboardPanel,
  SavedDashboardSection,
} from '../../../dashboard_saved_object';
import type { DashboardState, DashboardPanel, DashboardSection } from '../../types';
import { embeddableService, logger } from '../../../kibana_services';

export function transformPanelsIn(widgets: Required<DashboardState>['panels']): {
  panelsJSON: DashboardSavedObjectAttributes['panelsJSON'];
  sections: DashboardSavedObjectAttributes['sections'];
  references: SavedObjectReference[];
} {
  const panels: SavedDashboardPanel[] = [];
  const sections: SavedDashboardSection[] = [];
  const panelReferences: SavedObjectReference[] = [];

  widgets.forEach((widget) => {
    if (isDashboardSection(widget)) {
      const { panels: sectionPanels, grid, uid, ...restOfSection } = widget as DashboardSection;
      const idx = uid ?? uuidv4();
      sections.push({ ...restOfSection, gridData: { ...grid, i: idx } });
      sectionPanels.forEach((panel) => {
        const { storedPanel, references } = transformPanelIn(panel);
        panels.push({
          ...storedPanel,
          gridData: { ...storedPanel.gridData, sectionId: idx },
        });
        panelReferences.push(...references);
      });
    } else {
      // widget is a panel
      const { storedPanel, references } = transformPanelIn(widget);
      panels.push(storedPanel);
      panelReferences.push(...references);
    }
  });
  return { panelsJSON: JSON.stringify(panels), sections, references: panelReferences };
}

function transformPanelIn(panel: DashboardPanel): {
  storedPanel: SavedDashboardPanel;
  references: SavedObjectReference[];
} {
  const { uid, grid, config, ...restPanel } = panel;
  const idx = uid ?? uuidv4();

  const transforms = embeddableService?.getTransforms(panel.type);
  const panelSchema = transforms?.getSchema?.();

  if (panelSchema) {
    try {
      panelSchema.validate(config);
    } catch (error) {
      throw Boom.badRequest(
        `Panel config validation failed. Panel uid: ${uid}, type: ${restPanel.type}, validation error: ${error.message}`
      );
    }
  }

  let transformedPanelConfig = config;
  let references: undefined | SavedObjectReference[];
  try {
    if (transforms?.transformIn) {
      const transformed = transforms.transformIn(config);
      transformedPanelConfig = transformed.state;
      references = transformed.references;
    }
  } catch (transformInError) {
    // do not prevent save if transformIn throws
    logger.warn(
      `Unable to transform "${panel.type}" embeddable state on save. Error: ${transformInError.message}`
    );
  }

  return {
    storedPanel: {
      ...restPanel,
      embeddableConfig: transformedPanelConfig as SavedDashboardPanel['embeddableConfig'],
      panelIndex: idx,
      gridData: {
        ...grid,
        i: idx,
      },
    },
    references: prefixReferencesFromPanel(idx, references ?? []),
  };
}
