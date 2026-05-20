import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
interface StepNameValidationError {
    stepName: string;
    occurrences: number;
    message: string;
}
export interface StepNameValidationResult {
    isValid: boolean;
    errors: StepNameValidationError[];
}
/**
 * Validates that all step names in a workflow are unique
 */
export declare function validateStepNameUniqueness(workflow: WorkflowYaml): StepNameValidationResult;
export {};
