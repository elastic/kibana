/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { managedWorkflowDefinitions } from './definitions';
import type {
  ManagedWorkflowDefinition,
  ManagedWorkflowManagement,
  ManagedWorkflowTemplateValues,
} from './types';

export type { ManagedWorkflowDefinition, ManagedWorkflowManagement, ManagedWorkflowTemplateValues };
export * from './definitions';

type ManagedWorkflowDefinitionById = {
  [TDefinition in (typeof managedWorkflowDefinitions)[number] as TDefinition['id']]: TDefinition;
};

export type ManagedWorkflowId = keyof ManagedWorkflowDefinitionById;
type ManagedWorkflowDefinitionEntry = ManagedWorkflowDefinitionById[ManagedWorkflowId];

type ManagedWorkflowTemplateValuesForDefinition<TDefinition> = TDefinition extends {
  yamlTemplate: (values: infer TValues) => string;
}
  ? TValues
  : never;

export type TemplatedManagedWorkflowId = {
  [TId in ManagedWorkflowId]: ManagedWorkflowTemplateValuesForDefinition<
    ManagedWorkflowDefinitionById[TId]
  > extends never
    ? never
    : TId;
}[ManagedWorkflowId];

export type ManagedWorkflowTemplateValuesById = {
  [TId in TemplatedManagedWorkflowId]: ManagedWorkflowTemplateValuesForDefinition<
    ManagedWorkflowDefinitionById[TId]
  >;
};

export type ManagedWorkflowTemplateValuesForId<TId extends ManagedWorkflowId> =
  TId extends TemplatedManagedWorkflowId ? ManagedWorkflowTemplateValuesById[TId] : never;

export const getManagedWorkflowDefinition = (id: string): ManagedWorkflowDefinition | undefined => {
  return managedWorkflowDefinitions.find(
    (definition): definition is ManagedWorkflowDefinitionEntry => definition.id === id
  );
};

export const getManagedWorkflowDefinitions = (): ManagedWorkflowDefinition[] => {
  return [...managedWorkflowDefinitions];
};
