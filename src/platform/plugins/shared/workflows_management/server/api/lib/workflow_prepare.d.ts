import type { EsWorkflow, WorkflowYaml } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import type { WorkflowProperties } from '../../storage/workflow_storage';
/** Derives a list of trigger type ids from a workflow definition. */
export declare const getTriggerTypesFromDefinition: (definition: WorkflowYaml | null | undefined) => string[];
/** True when the YAML root map includes `enabled` (before Zod defaults). */
export declare const workflowYamlDeclaresTopLevelEnabled: (yamlString: string) => boolean;
/**
 * Validates YAML and builds a WorkflowProperties document ready for indexing.
 * Shared by user-created and managed workflow creation paths.
 */
export declare const prepareWorkflowDocumentFromYaml: (params: {
    id?: string;
    yaml: string;
    zodSchema: z.ZodType;
    authenticatedUser: string;
    now: Date;
    spaceId: string;
    triggerDefinitions?: Array<{
        id: string;
        eventSchema: z.ZodType;
    }>;
}) => {
    id: string;
    workflowData: WorkflowProperties;
    definition?: WorkflowYaml;
};
/**
 * Validates YAML update and returns the storage patch + validation errors.
 * Pure function — caller resolves zodSchema and triggerDefinitions before calling.
 */
export declare const applyYamlUpdate: (params: {
    workflowYaml: string;
    zodSchema: z.ZodType;
    triggerDefinitions: Array<{
        id: string;
        eventSchema: z.ZodType;
    }>;
}) => {
    updatedDataPatch: Partial<WorkflowProperties>;
    validationErrors: string[];
    shouldUpdateScheduler: boolean;
};
/**
 * Builds the storage patch for field-only (non-YAML) updates.
 * Used by updateWorkflow when workflow.yaml is not provided.
 */
export declare const applyFieldUpdates: (workflow: Partial<EsWorkflow>, existingSource: WorkflowProperties) => {
    patch: Partial<WorkflowProperties>;
    validationErrors: string[];
};
