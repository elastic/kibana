/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { v4 } from 'uuid';

import type { Reference } from '@kbn/content-management-utils';
import type { DashboardPanelMap, DashboardSectionMap } from '..';
import type {
  DashboardAttributes,
  DashboardPanel,
  DashboardSection,
} from '../../server/content_management';

import {
  getReferencesForPanelId,
  prefixReferencesFromPanel,
} from '../dashboard_container/persistable_state/dashboard_container_references';

export const isDashboardSection = (
  widget: DashboardAttributes['panels'][number]
): widget is DashboardSection => {
  return 'panels' in widget;
};

export const convertPanelsArrayToPanelSectionMaps = (
  panels?: DashboardAttributes['panels']
): { panels: DashboardPanelMap; sections: DashboardSectionMap } => {
  const panelsMap: DashboardPanelMap = {};
  const sectionsMap: DashboardSectionMap = {};

  /**
   * panels and sections are mixed in the DashboardAttributes 'panels' key, so we need
   * to separate them out into separate maps for the dashboard client side code
   */
  panels?.forEach((widget, i) => {
    if (isDashboardSection(widget)) {
      const sectionId = widget.gridData.i ?? String(i);
      const { panels: sectionPanels, ...restOfSection } = widget;
      sectionsMap[sectionId] = {
        ...restOfSection,
        gridData: {
          ...widget.gridData,
          i: sectionId,
        },
        id: sectionId,
      };
      (sectionPanels as DashboardPanel[]).forEach((panel, j) => {
        const panelId = panel.panelIndex ?? String(j);
        const transformed = transformPanel(panel);
        panelsMap[panelId] = {
          ...transformed,
          gridData: { ...transformed.gridData, sectionId, i: panelId },
        };
      });
    } else {
      // if not a section, then this widget is a panel
      panelsMap[widget.panelIndex ?? String(i)] = transformPanel(widget);
    }
  });

  return { panels: panelsMap, sections: sectionsMap };
};

const transformPanel = (panel: DashboardPanel): DashboardPanelMap[string] => {
  return {
    type: panel.type,
    gridData: panel.gridData,
    panelRefName: panel.panelRefName,
    explicitInput: {
      ...(panel.id !== undefined && { savedObjectId: panel.id }),
      ...(panel.title !== undefined && { title: panel.title }),
      ...panel.panelConfig,
    },
    version: panel.version,
  };
};

export const convertPanelSectionMapsToPanelsArray = (
  panels: DashboardPanelMap,
  sections: DashboardSectionMap,
  removeLegacyVersion?: boolean
): DashboardAttributes['panels'] => {
  const combined: DashboardAttributes['panels'] = [];

  const panelsInSections: { [sectionId: string]: DashboardSection } = {};
  Object.entries(sections).forEach(([sectionId, sectionState]) => {
    panelsInSections[sectionId] = { ...omit(sectionState, 'id'), panels: [] };
  });
  Object.entries(panels).forEach(([panelId, panelState]) => {
    const savedObjectId = (panelState.explicitInput as { savedObjectId?: string }).savedObjectId;
    const title = (panelState.explicitInput as { title?: string }).title;
    const { sectionId, ...gridData } = panelState.gridData; // drop section ID
    const convertedPanelState = {
      /**
       * Version information used to be stored in the panel until 8.11 when it was moved to live inside the
       * explicit Embeddable Input. If removeLegacyVersion is not passed, we'd like to keep this information for
       * the time being.
       */
      ...(!removeLegacyVersion ? { version: panelState.version } : {}),

      type: panelState.type,
      gridData,
      panelIndex: panelId,
      panelConfig: omit(panelState.explicitInput, ['id', 'savedObjectId', 'title']),
      ...(title !== undefined && { title }),
      ...(savedObjectId !== undefined && { id: savedObjectId }),
      ...(panelState.panelRefName !== undefined && { panelRefName: panelState.panelRefName }),
    };

    if (sectionId) {
      panelsInSections[sectionId].panels.push(convertedPanelState);
    } else {
      combined.push(convertedPanelState);
    }
  });

  return [...combined, ...Object.values(panelsInSections)];
};

/**
 * When saving a dashboard as a copy, we should generate new IDs for all panels so that they are
 * properly refreshed when navigating between Dashboards
 */
export const generateNewPanelIds = (panels: DashboardPanelMap, references?: Reference[]) => {
  const newPanelsMap: DashboardPanelMap = {};
  const newReferences: Reference[] = [];
  for (const [oldId, panel] of Object.entries(panels)) {
    const newId = v4();
    newPanelsMap[newId] = {
      ...panel,
      gridData: { ...panel.gridData, i: newId },
      explicitInput: panel.explicitInput ?? {},
    };
    newReferences.push(
      ...prefixReferencesFromPanel(newId, getReferencesForPanelId(oldId, references ?? []))
    );
  }
  return { panels: newPanelsMap, references: newReferences };
};
