/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { SavedObjectAttributesWithReferences } from '@kbn/embeddable-plugin/common/types';
import { LastSavedState } from '../types';

const SAVED_STATE_SESSION_STORAGE_KEY =
  'kibana.examples.embeddables.presentationContainerExample.savedState';

export const DEFAULT_STATE: LastSavedState = {
  timeRange: {
    from: 'now-15m',
    to: 'now',
  },
  panelsState: [],
};

const isByValue = (rawState: object): rawState is SavedObjectAttributesWithReferences<any> =>
  'attributes' in rawState;

export const lastSavedStateSessionStorage = {
  clear: () => {
    sessionStorage.removeItem(SAVED_STATE_SESSION_STORAGE_KEY);
  },
  load: (embeddable: EmbeddableStart): LastSavedState => {
    const savedState = sessionStorage.getItem(SAVED_STATE_SESSION_STORAGE_KEY);
    const { timeRange, panelsState } = savedState
      ? (JSON.parse(savedState) as LastSavedState)
      : { ...DEFAULT_STATE };
    const transformedPanels = panelsState.map((panel) => {
      const { rawState } = panel.panelState;
      if (!isByValue(rawState)) return panel;

      // Transform the panel state if necessary, e.g., to ensure compatibility with the latest version
      const embeddableCmDefinitions = embeddable.getEmbeddableContentManagementDefinition(
        panel.type
      );
      const { savedObjectToItem } =
        embeddableCmDefinitions?.versions[embeddableCmDefinitions.latestVersion] ?? {};
      if (!savedObjectToItem) return panel;
      const newState = savedObjectToItem(rawState);
      return {
        ...panel,
        panelState: {
          rawState: newState,
        },
      };
    });
    return { timeRange, panelsState: transformedPanels };
  },
  save: (state: LastSavedState, embeddable: EmbeddableStart) => {
    const transformedPanels = state.panelsState.map((panel) => {
      const { rawState } = panel.panelState;
      if (!isByValue(rawState)) return panel;

      // Transform the panel state if necessary, e.g., to ensure compatibility with the latest version
      const embeddableCmDefinitions = embeddable.getEmbeddableContentManagementDefinition(
        panel.type
      );
      const { itemToSavedObject } =
        embeddableCmDefinitions?.versions[embeddableCmDefinitions.latestVersion] ?? {};
      if (!itemToSavedObject) return panel;
      const savedState = itemToSavedObject(rawState);
      return {
        ...panel,
        panelState: {
          rawState: savedState,
        },
      };
    });
    state.panelsState = transformedPanels;
    sessionStorage.setItem(SAVED_STATE_SESSION_STORAGE_KEY, JSON.stringify(state));
  },
};
