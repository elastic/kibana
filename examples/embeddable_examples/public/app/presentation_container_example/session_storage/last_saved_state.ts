/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import {
  EmbeddableContentManagementDefinition,
  SavedObjectAttributesWithReferences,
} from '@kbn/embeddable-plugin/common/types';
import { PageState } from '../types';

const SAVED_STATE_SESSION_STORAGE_KEY =
  'kibana.examples.embeddables.presentationContainerExample.savedState';

export const DEFAULT_STATE: PageState = {
  timeRange: {
    from: 'now-15m',
    to: 'now',
  },
  panels: [],
};

const isByValue = (
  serializedState: unknown
): serializedState is SavedObjectAttributesWithReferences<any> =>
  typeof serializedState === 'object' &&
  serializedState !== null &&
  'attributes' in serializedState;

const getLatestVersionOfDefinition = (
  embeddableCmDefinitions?: EmbeddableContentManagementDefinition
) => {
  if (!embeddableCmDefinitions) return {};
  return embeddableCmDefinitions.versions[embeddableCmDefinitions.latestVersion];
};

export const lastSavedStateSessionStorage = {
  clear: () => {
    sessionStorage.removeItem(SAVED_STATE_SESSION_STORAGE_KEY);
  },
  load: async (embeddable: EmbeddableStart): Promise<PageState> => {
    const savedState = sessionStorage.getItem(SAVED_STATE_SESSION_STORAGE_KEY);
    const { timeRange, panels } = savedState
      ? (JSON.parse(savedState) as PageState)
      : { ...DEFAULT_STATE };
    const transformedPanels = await Promise.all(
      panels.map(async (panel) => {
        const { rawState } = panel.serializedState ?? {};
        if (!isByValue(rawState)) return panel;

        // Transform the panel state if necessary, e.g., to ensure compatibility with the latest version
        const embeddableCmDefinitions = await embeddable.getEmbeddableContentManagementDefinition(
          panel.type
        );
        const { savedObjectToItem } = getLatestVersionOfDefinition(embeddableCmDefinitions);
        if (!savedObjectToItem) return panel;
        const newState = savedObjectToItem(rawState);

        return {
          ...panel,
          serializedState: {
            rawState: { attributes: newState },
          },
        };
      })
    );
    return { timeRange, panels: transformedPanels };
  },
  save: async (state: PageState, embeddable: EmbeddableStart) => {
    const transformedPanels = await Promise.all(
      state.panels.map(async (panel) => {
        const { rawState } = panel.serializedState ?? {};
        if (!isByValue(rawState)) return panel;

        // Transform the panel state if necessary, e.g., to ensure compatibility with the latest version
        const embeddableCmDefinitions = await embeddable.getEmbeddableContentManagementDefinition(
          panel.type
        );
        const { itemToSavedObject } = getLatestVersionOfDefinition(embeddableCmDefinitions);
        if (!itemToSavedObject) return panel;
        const savedState = itemToSavedObject(rawState.attributes);
        return {
          ...panel,
          serializedState: { rawState: savedState },
        };
      })
    );
    state.panels = transformedPanels;
    sessionStorage.setItem(SAVED_STATE_SESSION_STORAGE_KEY, JSON.stringify(state));
  },
};
