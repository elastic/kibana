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
} from '@kbn/embeddable-plugin/common/types';
import { SavedObjectReference } from '@kbn/core/types';
import { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import { ControlGroupInput, ControlPanelState } from './types';
import { makeControlOrdersZeroBased } from './control_group_migrations';

type ControlGroupInputWithType = Partial<ControlGroupInput> & { type: string };

const getPanelStatePrefix = (state: ControlPanelState) => `${state.explicitInput.id}:`;

export const createControlGroupInject = (
  persistableStateService: EmbeddablePersistableStateService
): EmbeddablePersistableStateService['inject'] => {
  return (state: EmbeddableStateWithType, references: SavedObjectReference[]) => {
    const workingState = { ...state } as EmbeddableStateWithType | ControlGroupInputWithType;

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

export const createControlGroupExtract = (
  persistableStateService: EmbeddablePersistableStateService
): EmbeddablePersistableStateService['extract'] => {
  return (state: EmbeddableStateWithType) => {
    const workingState = { ...state } as EmbeddableStateWithType | ControlGroupInputWithType;
    const references: SavedObjectReference[] = [];

    if ('panels' in workingState) {
      workingState.panels = { ...workingState.panels };

      // Run every panel through the state service to get the nested references
      for (const [key, panel] of Object.entries(workingState.panels)) {
        const prefix = getPanelStatePrefix(panel);

        const { state: panelState, references: panelReferences } = persistableStateService.extract({
          ...panel.explicitInput,
          type: panel.type,
        });

        // Map reference to its embeddable id for lookup in inject
        const mappedReferences = panelReferences.map((reference) => ({
          ...reference,
          name: `${prefix}${reference.name}`,
        }));

        references.push(...mappedReferences);

        const { type, ...restOfState } = panelState;
        workingState.panels[key].explicitInput = restOfState as EmbeddableInput;
      }
    }
    return { state: workingState as EmbeddableStateWithType, references };
  };
};

export const migrations: MigrateFunctionsObject = {
  '8.2.0': (state) => {
    const controlInput = state as unknown as ControlGroupInput;
    // for hierarchical chaining it is required that all control orders start at 0.
    return makeControlOrdersZeroBased(controlInput);
  },
};
