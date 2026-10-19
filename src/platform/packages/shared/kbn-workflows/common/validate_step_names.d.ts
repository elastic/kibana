import type { WorkflowYaml } from '../spec/schema';
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
 * Validates that all step names in a workflow are unique.
 * Uses `walkStepTree` to cover every slot: `steps`, `else`, `branches[]`,
 * `cases[]`, `default`, `on-failure.fallback`, `iteration-on-failure.fallback`.
 */
export declare function validateStepNameUniqueness(workflow: WorkflowYaml): StepNameValidationResult;
export {};
