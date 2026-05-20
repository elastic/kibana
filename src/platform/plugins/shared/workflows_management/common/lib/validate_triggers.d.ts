import type { WorkflowYaml } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
export interface TriggerDefinitionForConditionValidation {
    eventSchema: z.ZodType;
}
export interface TriggerConditionValidationError {
    triggerIndex: number;
    message: string;
}
/**
 * Validates that each custom trigger's `on.condition` is valid KQL and only
 * references properties from that trigger's eventSchema.
 */
export declare function validateTriggerConditionsForWorkflow(workflow: WorkflowYaml, getTriggerDefinition: (triggerType: string) => TriggerDefinitionForConditionValidation | undefined): {
    valid: boolean;
    errors: TriggerConditionValidationError[];
};
export interface TriggerDefinitionForValidateTriggers {
    id: string;
    eventSchema: z.ZodType;
}
/**
 * Centralized validation of all triggers in workflow YAML (conditions and any other criteria).
 * Use this from the service layer; it delegates to validateTriggerConditionsForWorkflow.
 */
export declare function validateTriggers(workflow: WorkflowYaml, triggerDefinitions: TriggerDefinitionForValidateTriggers[]): {
    valid: boolean;
    errors: TriggerConditionValidationError[];
};
