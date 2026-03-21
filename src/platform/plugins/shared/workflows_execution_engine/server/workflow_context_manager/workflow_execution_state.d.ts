import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
export declare class WorkflowExecutionState {
    private workflowExecutionRepository;
    private workflowStepExecutionRepository;
    private stepExecutions;
    private workflowExecution;
    private workflowDocumentChanges;
    private stepDocumentsChanges;
    /**
     * Maps step IDs to their execution IDs in chronological order.
     * This index enables efficient lookup of all executions for a given step,
     * which is especially important for steps that execute multiple times
     * (e.g., in loops or retries).
     */
    private stepIdExecutionIdIndex;
    constructor(initialWorkflowExecution: EsWorkflowExecution, workflowExecutionRepository: WorkflowExecutionRepository, workflowStepExecutionRepository: StepExecutionRepository);
    load(): Promise<void>;
    getWorkflowExecution(): EsWorkflowExecution;
    updateWorkflowExecution(workflowExecution: Partial<EsWorkflowExecution>): void;
    getAllStepExecutions(): EsWorkflowStepExecution[];
    getStepExecution(stepExecutionId: string): EsWorkflowStepExecution | undefined;
    /**
     * Retrieves all executions for a specific workflow step in chronological order.
     * @param stepId The unique identifier of the step
     * @returns An array of step execution objects or undefined if no executions exist
     */
    getStepExecutionsByStepId(stepId: string): EsWorkflowStepExecution[];
    /**
     * Retrieves the latest execution for a specific workflow step.
     * @param stepId The unique identifier of the step
     * @returns The latest step execution object or undefined if no executions exist
     */
    getLatestStepExecution(stepId: string): EsWorkflowStepExecution | undefined;
    upsertStep(step: Partial<EsWorkflowStepExecution>): void;
    flushStepChanges(): Promise<void>;
    flush(): Promise<void>;
    private flushWorkflowChanges;
    private createStep;
    private updateStep;
    private buildStepIdExecutionIdIndex;
}
