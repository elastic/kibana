/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import Semver from 'semver';
import { SavedObjectAttributes, SavedObjectReference } from '../../../core/types';
import { DashboardContainerStateWithType, DashboardPanelState } from './types';
import { EmbeddablePersistableStateService } from '../../embeddable/common/types';
import {
  convertPanelStateToSavedDashboardPanel,
  convertSavedDashboardPanelToPanelState,
} from './embeddable/embeddable_saved_object_converters';
import { SavedDashboardPanel } from './types';
export interface ExtractDeps {
  embeddablePersistableStateService: EmbeddablePersistableStateService;
}
export interface SavedObjectAttributesAndReferences {
  attributes: SavedObjectAttributes;
  references: SavedObjectReference[];
}

const isPre730Panel = (panel: Record<string, string>): boolean => {
  return 'version' in panel ? Semver.gt('7.3.0', panel.version) : true;
};

function dashboardAttributesToState(attributes: SavedObjectAttributes): {
  state: DashboardContainerStateWithType;
  panels: SavedDashboardPanel[];
} {
  let inputPanels = [] as SavedDashboardPanel[];
  if (typeof attributes.panelsJSON === 'string') {
    inputPanels = JSON.parse(attributes.panelsJSON) as SavedDashboardPanel[];
  }

  return {
    panels: inputPanels,
    state: {
      id: attributes.id as string,
      type: 'dashboard',
      panels: inputPanels.reduce<Record<string, DashboardPanelState>>((current, panel, index) => {
        const panelIndex = panel.panelIndex || `${index}`;
        current[panelIndex] = convertSavedDashboardPanelToPanelState(panel);
        return current;
      }, {}),
    },
  };
}

function panelStatesToPanels(
  panelStates: DashboardContainerStateWithType['panels'],
  originalPanels: SavedDashboardPanel[]
): SavedDashboardPanel[] {
  return Object.entries(panelStates).map(([id, panelState]) => {
    // Find matching original panel to get the version
    let originalPanel = originalPanels.find((p) => p.panelIndex === id);

    if (!originalPanel) {
      // Maybe original panel doesn't have a panel index and it's just straight up based on it's index
      const numericId = parseInt(id, 10);
      originalPanel = isNaN(numericId) ? originalPanel : originalPanels[numericId];
    }

    return convertPanelStateToSavedDashboardPanel(
      panelState,
      originalPanel?.version ? originalPanel.version : ''
    );
  });
}

export function extractReferences(
  { attributes, references = [] }: SavedObjectAttributesAndReferences,
  deps: ExtractDeps
): SavedObjectAttributesAndReferences {
  if (typeof attributes.panelsJSON !== 'string') {
    return { attributes, references };
  }

  const { panels, state } = dashboardAttributesToState(attributes);
  if (!Array.isArray(panels)) {
    return { attributes, references };
  }

  if ((panels as unknown as Array<Record<string, string>>).some(isPre730Panel)) {
    return pre730ExtractReferences({ attributes, references }, deps);
  }

  const missingTypeIndex = panels.findIndex((panel) => panel.type === undefined);
  if (missingTypeIndex >= 0) {
    throw new Error(`"type" attribute is missing from panel "${missingTypeIndex}"`);
  }

  const { state: extractedState, references: extractedReferences } =
    deps.embeddablePersistableStateService.extract(state);

  const extractedPanels = panelStatesToPanels(
    (extractedState as DashboardContainerStateWithType).panels,
    panels
  );

  return {
    references: [...references, ...extractedReferences],
    attributes: {
      ...attributes,
      panelsJSON: JSON.stringify(extractedPanels),
    },
  };
}

export interface InjectDeps {
  embeddablePersistableStateService: EmbeddablePersistableStateService;
}

export function injectReferences(
  { attributes, references = [] }: SavedObjectAttributesAndReferences,
  deps: InjectDeps
): SavedObjectAttributes {
  // Skip if panelsJSON is missing otherwise this will cause saved object import to fail when
  // importing objects without panelsJSON. At development time of this, there is no guarantee each saved
  // object has panelsJSON in all previous versions of kibana.
  if (typeof attributes.panelsJSON !== 'string') {
    return attributes;
  }
  const parsedPanels = JSON.parse(attributes.panelsJSON);
  // Same here, prevent failing saved object import if ever panels aren't an array.
  if (!Array.isArray(parsedPanels)) {
    return attributes;
  }

  const { panels, state } = dashboardAttributesToState(attributes);

  const injectedState = deps.embeddablePersistableStateService.inject(state, references);
  const injectedPanels = panelStatesToPanels(
    (injectedState as DashboardContainerStateWithType).panels,
    panels
  );

  return {
    ...attributes,
    panelsJSON: JSON.stringify(injectedPanels),
  };
}

function pre730ExtractReferences(
  { attributes, references = [] }: SavedObjectAttributesAndReferences,
  deps: ExtractDeps
): SavedObjectAttributesAndReferences {
  if (typeof attributes.panelsJSON !== 'string') {
    return { attributes, references };
  }
  const panelReferences: SavedObjectReference[] = [];
  const panels: Array<Record<string, string>> = JSON.parse(String(attributes.panelsJSON));

  panels.forEach((panel, i) => {
    if (!panel.type) {
      throw new Error(`"type" attribute is missing from panel "${i}"`);
    }
    if (!panel.id) {
      // Embeddables are not required to be backed off a saved object.
      return;
    }

    panel.panelRefName = `panel_${i}`;
    panelReferences.push({
      name: `panel_${i}`,
      type: panel.type,
      id: panel.id,
    });
    delete panel.type;
    delete panel.id;
  });

  return {
    references: [...references, ...panelReferences],
    attributes: {
      ...attributes,
      panelsJSON: JSON.stringify(panels),
    },
  };
}
