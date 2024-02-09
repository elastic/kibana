/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';
import { CONTROL_GROUP_TYPE, PersistableControlGroupInput } from '@kbn/controls-plugin/common';
import {
  EmbeddableInput,
  EmbeddablePersistableStateService,
  EmbeddableStateWithType,
} from '@kbn/embeddable-plugin/common';
import { ParsedDashboardAttributesWithType } from '../../types';

const controlGroupReferencePrefix = 'controlGroup_';
const controlGroupId = 'dashboard_control_group';

export const getReferencesForPanelId = (id: string, references: Reference[]): Reference[] => {
  const prefix = `${id}:`;
  const filteredReferences = references
    .filter((reference) => reference.name.indexOf(prefix) === 0)
    .map((reference) => ({ ...reference, name: reference.name.replace(prefix, '') }));
  return filteredReferences;
};

export const prefixReferencesFromPanel = (id: string, references: Reference[]): Reference[] => {
  const prefix = `${id}:`;
  return references
    .filter((reference) => reference.type !== 'tag') // panel references should never contain tags. If they do, they must be removed
    .map((reference) => ({
      ...reference,
      name: `${prefix}${reference.name}`,
    }));
};

export const createInject = (
  persistableStateService: EmbeddablePersistableStateService
): EmbeddablePersistableStateService['inject'] => {
  return (state: EmbeddableStateWithType, references: Reference[]) => {
    const workingState = { ...state } as
      | EmbeddableStateWithType
      | ParsedDashboardAttributesWithType;

    if ('panels' in workingState) {
      workingState.panels = { ...workingState.panels };

      for (const [id, panel] of Object.entries(workingState.panels)) {
        workingState.panels[id] = { ...panel };

        const panelReferences = getReferencesForPanelId(id, references);

        const { type, ...injectedState } = persistableStateService.inject(
          { ...workingState.panels[id].explicitInput, type: workingState.panels[id].type },
          panelReferences
        );

        workingState.panels[id].explicitInput = injectedState as EmbeddableInput;
      }
    }

    // since the controlGroup is not part of the panels array, its references need to be injected separately
    if ('controlGroupInput' in workingState && workingState.controlGroupInput) {
      const controlGroupReferences = references
        .filter((reference) => reference.name.indexOf(controlGroupReferencePrefix) === 0)
        .map((reference) => ({
          ...reference,
          name: reference.name.replace(controlGroupReferencePrefix, ''),
        }));

      const { type, ...injectedControlGroupState } = persistableStateService.inject(
        {
          ...workingState.controlGroupInput,
          type: CONTROL_GROUP_TYPE,
          id: controlGroupId,
        },
        controlGroupReferences
      );
      workingState.controlGroupInput =
        injectedControlGroupState as unknown as PersistableControlGroupInput;
    }

    return workingState as EmbeddableStateWithType;
  };
};

export const createExtract = (
  persistableStateService: EmbeddablePersistableStateService
): EmbeddablePersistableStateService['extract'] => {
  return (state: EmbeddableStateWithType) => {
    const workingState = { ...state } as
      | EmbeddableStateWithType
      | ParsedDashboardAttributesWithType;

    const references: Reference[] = [];

    if ('panels' in workingState) {
      workingState.panels = { ...workingState.panels };

      // Run every panel through the state service to get the nested references
      for (const [id, panel] of Object.entries(workingState.panels)) {
        const { state: panelState, references: panelReferences } = persistableStateService.extract({
          ...panel.explicitInput,
          type: panel.type,
        });
        references.push(...prefixReferencesFromPanel(id, panelReferences));
        const { type, ...restOfState } = panelState;
        workingState.panels[id].explicitInput = restOfState as EmbeddableInput;
      }
    }

    // since the controlGroup is not part of the panels array, its references need to be extracted separately
    if ('controlGroupInput' in workingState && workingState.controlGroupInput) {
      const { state: extractedControlGroupState, references: controlGroupReferences } =
        persistableStateService.extract({
          ...workingState.controlGroupInput,
          type: CONTROL_GROUP_TYPE,
          id: controlGroupId,
        });
      workingState.controlGroupInput =
        extractedControlGroupState as unknown as PersistableControlGroupInput;
      const prefixedControlGroupReferences = controlGroupReferences.map((reference) => ({
        ...reference,
        name: `${controlGroupReferencePrefix}${reference.name}`,
      }));
      references.push(...prefixedControlGroupReferences);
    }

    return { state: workingState as EmbeddableStateWithType, references };
  };
};
