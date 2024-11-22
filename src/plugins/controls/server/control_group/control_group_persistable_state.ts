/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectReference } from '@kbn/core/types';
import {
  EmbeddableInput,
  EmbeddablePersistableStateService,
  EmbeddableStateWithType,
} from '@kbn/embeddable-plugin/common/types';
import { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';

import type { ControlPanelsState, SerializedControlState } from '../../common';
import {
  makeControlOrdersZeroBased,
  removeHideExcludeAndHideExists,
} from './control_group_migrations';
import { SerializableControlGroupState } from './types';

const getPanelStatePrefix = (state: SerializedControlState) => `${state.explicitInput.id}:`;

export const createControlGroupInject = (
  persistableStateService: EmbeddablePersistableStateService
): EmbeddablePersistableStateService['inject'] => {
  return (state: EmbeddableStateWithType, references: SavedObjectReference[]) => {
    const workingState = { ...state } as EmbeddableStateWithType | SerializableControlGroupState;

    let workingPanels: ControlPanelsState<SerializedControlState> = {};
    if ('panels' in workingState) {
      workingPanels = { ...workingState.panels };

      for (const [key, panel] of Object.entries(workingPanels)) {
        workingPanels[key] = {
          ...panel,
        };
        // Find the references for this panel
        const prefix = getPanelStatePrefix(panel);

        const filteredReferences = references
          .filter((reference) => reference.name.indexOf(prefix) === 0)
          .map((reference) => ({ ...reference, name: reference.name.replace(prefix, '') }));

        const panelReferences = filteredReferences.length === 0 ? references : filteredReferences;

        const { type, ...injectedState } = persistableStateService.inject(
          { ...workingPanels[key].explicitInput, type: workingPanels[key].type },
          panelReferences
        );
        workingPanels[key].explicitInput = injectedState as EmbeddableInput;
      }
    }
    return { ...workingState, panels: workingPanels } as unknown as EmbeddableStateWithType;
  };
};

export const createControlGroupExtract = (
  persistableStateService: EmbeddablePersistableStateService
): EmbeddablePersistableStateService['extract'] => {
  return (state: EmbeddableStateWithType) => {
    const workingState = { ...state } as EmbeddableStateWithType | SerializableControlGroupState;
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
        (workingState.panels as ControlPanelsState<SerializedControlState>)[key].explicitInput =
          restOfState as EmbeddableInput;
      }
    }
    return { state: workingState as EmbeddableStateWithType, references };
  };
};

export const migrations: MigrateFunctionsObject = {
  '8.2.0': (state) => {
    const controlInput = state as unknown as SerializableControlGroupState;
    // for hierarchical chaining it is required that all control orders start at 0.
    return makeControlOrdersZeroBased(controlInput);
  },
  '8.7.0': (state) => {
    const controlInput = state as unknown as SerializableControlGroupState;
    // need to set `hideExclude` and `hideExists` to `undefined` for all options list controls.
    return removeHideExcludeAndHideExists(controlInput);
  },
};
