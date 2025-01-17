/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import {
  EmbeddableInput,
  EmbeddablePersistableStateService,
  EmbeddableStateWithType,
} from '@kbn/embeddable-plugin/common';
import { ParsedDashboardAttributesWithType } from '../../types';

export const getReferencesForPanelId = (id: string, references: Reference[]): Reference[] => {
  const prefix = `${id}:`;
  const filteredReferences = references
    .filter((reference) => reference.name.indexOf(prefix) === 0)
    .map((reference) => ({ ...reference, name: reference.name.replace(prefix, '') }));
  return filteredReferences;
};

export const getReferencesForControls = (references: Reference[]): Reference[] => {
  return references.filter((reference) => reference.name.startsWith(controlGroupReferencePrefix));
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

const controlGroupReferencePrefix = 'controlGroup_';

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

    return { state: workingState as EmbeddableStateWithType, references };
  };
};
