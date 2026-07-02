import { managedWorkflowDefinitions } from './definitions';
import type { ManagedWorkflowDefinition, ManagedWorkflowManagement, ManagedWorkflowTemplateValues } from './types';
export type { ManagedWorkflowDefinition, ManagedWorkflowManagement, ManagedWorkflowTemplateValues };
export * from './definitions';
type ManagedWorkflowDefinitionById = {
    [TDefinition in (typeof managedWorkflowDefinitions)[number] as TDefinition['id']]: TDefinition;
};
export type ManagedWorkflowId = keyof ManagedWorkflowDefinitionById;
export type ManagedWorkflowTemplateValuesById = {
    [TId in ManagedWorkflowId]: ManagedWorkflowDefinitionById[TId] extends {
        yamlTemplate: (values: infer TValues) => string;
    } ? TValues : never;
};
export type ManagedWorkflowTemplateValuesForId<TId extends ManagedWorkflowId> = ManagedWorkflowTemplateValuesById[TId];
export declare const getManagedWorkflowDefinition: (id: string) => ManagedWorkflowDefinition | undefined;
export declare const getManagedWorkflowDefinitions: () => ManagedWorkflowDefinition[];
