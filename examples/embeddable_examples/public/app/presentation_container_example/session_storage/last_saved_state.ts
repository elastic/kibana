/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
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

export const lastSavedStateSessionStorage = {
  clear: () => {
    sessionStorage.removeItem(SAVED_STATE_SESSION_STORAGE_KEY);
  },
  load: (embeddable: EmbeddableStart): PageState => {
    const savedState = sessionStorage.getItem(SAVED_STATE_SESSION_STORAGE_KEY);
    const { timeRange, panels } = savedState
      ? (JSON.parse(savedState) as PageState)
      : { ...DEFAULT_STATE };
    const transformedPanels = panels.map((panel) => {
      // Transform the panel state if necessary, e.g., to ensure compatibility with the latest version
      const embeddableCmDefinitions = embeddable.getEmbeddableContentManagementDefinition(
        panel.type
      );
      const { savedObjectToItem } =
        embeddableCmDefinitions?.versions[embeddableCmDefinitions.latestVersion] ?? {};
      if (!savedObjectToItem) return panel;
      const newState = savedObjectToItem({
        attributes: panel.serializedState?.rawState,
        references: panel.serializedState?.references,
      });
      return {
        ...panel,
        serializedState: {
          rawState: newState,
        },
      };
    });
    return { timeRange, panels: transformedPanels };
  },
  save: (state: PageState, embeddable: EmbeddableStart) => {
    const transformedPanels = state.panels.map((panel) => {
      // Transform the panel state if necessary, e.g., to ensure compatibility with the latest version
      const embeddableCmDefinitions = embeddable.getEmbeddableContentManagementDefinition(
        panel.type
      );
      const { itemToSavedObject } =
        embeddableCmDefinitions?.versions[embeddableCmDefinitions.latestVersion] ?? {};
      if (!itemToSavedObject) return panel;
      const savedState = itemToSavedObject({
        attributes: panel.serializedState?.rawState,
        references: panel.serializedState?.references,
      });
      return {
        ...panel,
        serializedState: {
          rawState: savedState,
        },
      };
    });
    state.panels = transformedPanels;
    sessionStorage.setItem(SAVED_STATE_SESSION_STORAGE_KEY, JSON.stringify(state));
  },
};
