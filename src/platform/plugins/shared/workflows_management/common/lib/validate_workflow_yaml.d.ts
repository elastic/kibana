import type { ValidateWorkflowResponseDto } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import type { TriggerDefinitionForValidateTriggers } from './validate_triggers';
export interface ValidateWorkflowYamlOptions {
    triggerDefinitions?: TriggerDefinitionForValidateTriggers[];
}
export declare function validateWorkflowYaml(yaml: string, zodSchema: z.ZodType, options?: ValidateWorkflowYamlOptions): ValidateWorkflowResponseDto;
