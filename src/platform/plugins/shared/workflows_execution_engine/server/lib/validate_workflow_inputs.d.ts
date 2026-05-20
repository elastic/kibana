import type { Logger } from '@kbn/core/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
/**
 * Validates workflow inputs against the workflow's input schema.
 * On failure, marks the execution as FAILED with an InputValidationError.
 *
 * @returns true if inputs are valid and execution can proceed, false if validation failed
 */
export declare const validateWorkflowInputs: (workflow: WorkflowExecutionEngineModel, context: Record<string, unknown>, executionId: string, workflowExecutionRepository: WorkflowExecutionRepository, logger: Logger) => Promise<boolean>;
