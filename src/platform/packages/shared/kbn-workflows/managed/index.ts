/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

<<<<<<< HEAD
import {
  EXAMPLE_MANAGED_WORKFLOW,
  EXAMPLE_MANAGED_WORKFLOW_ID,
} from './definitions/workflows_extensions_example';
=======
import { managedWorkflowDefinitions } from './definitions';
>>>>>>> 063f0831a9c1f476ef2347e464083d6e4e7e54cf
import type {
  ManagedWorkflowDefinition,
  ManagedWorkflowManagement,
  ManagedWorkflowTemplateValues,
} from './types';

export type { ManagedWorkflowDefinition, ManagedWorkflowManagement, ManagedWorkflowTemplateValues };
<<<<<<< HEAD

export const managedWorkflowDefinitions = [EXAMPLE_MANAGED_WORKFLOW] as const;
=======
export * from './definitions';
>>>>>>> 063f0831a9c1f476ef2347e464083d6e4e7e54cf

type ManagedWorkflowDefinitionById = {
  [TDefinition in (typeof managedWorkflowDefinitions)[number] as TDefinition['id']]: TDefinition;
};

export type ManagedWorkflowId = keyof ManagedWorkflowDefinitionById;
type ManagedWorkflowDefinitionEntry = ManagedWorkflowDefinitionById[ManagedWorkflowId];

export type ManagedWorkflowTemplateValuesById = {
  [TId in ManagedWorkflowId]: ManagedWorkflowDefinitionById[TId] extends {
    yamlTemplate: (values: infer TValues) => string;
  }
    ? TValues
    : never;
};

export type ManagedWorkflowTemplateValuesForId<TId extends ManagedWorkflowId> =
  ManagedWorkflowTemplateValuesById[TId];

export const getManagedWorkflowDefinition = (id: string): ManagedWorkflowDefinition | undefined => {
  return managedWorkflowDefinitions.find(
    (definition): definition is ManagedWorkflowDefinitionEntry => definition.id === id
  );
};

export const getManagedWorkflowDefinitions = (): ManagedWorkflowDefinition[] => {
  return [...managedWorkflowDefinitions];
};
<<<<<<< HEAD

export { EXAMPLE_MANAGED_WORKFLOW_ID };
=======
>>>>>>> 063f0831a9c1f476ef2347e464083d6e4e7e54cf
