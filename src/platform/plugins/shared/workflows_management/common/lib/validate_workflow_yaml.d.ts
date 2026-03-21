import type { WorkflowYaml } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import type { TriggerDefinitionForValidateTriggers } from './validate_triggers';
export type WorkflowDiagnosticSeverity = 'error' | 'warning' | 'info';
export interface WorkflowDiagnostic {
    severity: WorkflowDiagnosticSeverity;
    message: string;
    source: string;
    path?: (string | number)[];
}
export interface ValidateWorkflowResponse {
    valid: boolean;
    diagnostics: WorkflowDiagnostic[];
    parsedWorkflow?: WorkflowYaml;
}
export interface ValidateWorkflowYamlOptions {
    triggerDefinitions?: TriggerDefinitionForValidateTriggers[];
}
export declare function validateWorkflowYaml(yaml: string, zodSchema: z.ZodType, options?: ValidateWorkflowYamlOptions): ValidateWorkflowResponse;
