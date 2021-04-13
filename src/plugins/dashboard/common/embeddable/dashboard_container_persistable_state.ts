/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EmbeddableInput,
  EmbeddablePersistableStateService,
  EmbeddableStateWithType,
} from '../../../embeddable/common';
import { SavedObjectReference } from '../../../../core/types';
import { DashboardContainerStateWithType, DashboardPanelState } from '../types';

const getPanelStatePrefix = (state: DashboardPanelState) => `${state.explicitInput.id}:`;

export const createInject = (
  persistableStateService: EmbeddablePersistableStateService
): EmbeddablePersistableStateService['inject'] => {
  return (state: EmbeddableStateWithType, references: SavedObjectReference[]) => {
    const workingState = { ...state } as EmbeddableStateWithType | DashboardContainerStateWithType;

    if ('panels' in workingState) {
      workingState.panels = { ...workingState.panels };

      for (const [key, panel] of Object.entries(workingState.panels)) {
        workingState.panels[key] = { ...panel };
        // Find the references for this panel
        const prefix = getPanelStatePrefix(panel);

        const filteredReferences = references
          .filter((reference) => reference.name.indexOf(prefix) === 0)
          .map((reference) => ({ ...reference, name: reference.name.replace(prefix, '') }));

        const panelReferences = filteredReferences.length === 0 ? references : filteredReferences;

        // Inject dashboard references back in
        if (panel.panelRefName !== undefined) {
          const matchingReference = panelReferences.find(
            (reference) => reference.name === panel.panelRefName
          );

          if (!matchingReference) {
            throw new Error(`Could not find reference "${panel.panelRefName}"`);
          }

          if (matchingReference !== undefined) {
            workingState.panels[key] = {
              ...panel,
              type: matchingReference.type,
              explicitInput: {
                ...workingState.panels[key].explicitInput,
                savedObjectId: matchingReference.id,
              },
            };

            delete workingState.panels[key].panelRefName;
          }
        }

        const { type, ...injectedState } = persistableStateService.inject(
          { ...workingState.panels[key].explicitInput, type: workingState.panels[key].type },
          panelReferences
        );

        workingState.panels[key].explicitInput = injectedState as EmbeddableInput;
      }
    }

    return workingState as EmbeddableStateWithType;
  };
};

export const createExtract = (
  persistableStateService: EmbeddablePersistableStateService
): EmbeddablePersistableStateService['extract'] => {
  return (state: EmbeddableStateWithType) => {
    const workingState = { ...state } as EmbeddableStateWithType | DashboardContainerStateWithType;

    const references: SavedObjectReference[] = [];

    if ('panels' in workingState) {
      workingState.panels = { ...workingState.panels };

      // Run every panel through the state service to get the nested references
      for (const [key, panel] of Object.entries(workingState.panels)) {
        const prefix = getPanelStatePrefix(panel);

        // If the panel is a saved object, then we will make the reference for that saved object and change the explicit input
        if (panel.explicitInput.savedObjectId) {
          panel.panelRefName = `panel_${key}`;

          references.push({
            name: `${prefix}panel_${key}`,
            type: panel.type,
            id: panel.explicitInput.savedObjectId as string,
          });

          delete panel.explicitInput.savedObjectId;
          delete panel.explicitInput.type;
        }

        const { state: panelState, references: panelReferences } = persistableStateService.extract({
          ...panel.explicitInput,
          type: panel.type,
        });

        // We're going to prefix the names of the references so that we don't end up with dupes (from visualizations for instance)
        const prefixedReferences = panelReferences.map((reference) => ({
          ...reference,
          name: `${prefix}${reference.name}`,
        }));

        references.push(...prefixedReferences);

        const { type, ...restOfState } = panelState;
        workingState.panels[key].explicitInput = restOfState as EmbeddableInput;
      }
    }

    return { state: workingState as EmbeddableStateWithType, references };
  };
};
