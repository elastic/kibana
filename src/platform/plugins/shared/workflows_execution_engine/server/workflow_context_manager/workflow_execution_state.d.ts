import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
/** Context for the step that failed during this run; used to build workflow_execution_failed event. */
export interface FailedStepContext {
    stepId: string;
    stepName: string;
    stepExecutionId: string;
}
/**
 * Step-execution metadata held by `WorkflowExecutionState`. Excludes
 * `input` / `output` — those live in `StepIoService` and are merged in only
 * at flush time. Callers that need IO must go through the service.
 */
export type StepExecutionMetadata = Omit<EsWorkflowStepExecution, 'input' | 'output'>;
/**
 * Narrow view of `WorkflowExecutionState` used by `StepIoService`. Implemented
 * structurally via `Pick<WorkflowExecutionState, …>` rather than a separate
 * interface — the boundary is enforced by the type but costs nothing at
 * runtime (no closure bag, no extra allocation per state instance). State
 * still has no dependency on the IO layer.
 *
 * Surfaces metadata reads, workflow-level reads, and the lifecycle
 * change-tracking primitives that the service merges with its own IO
 * partials at flush time. IO storage and ES persistence (bulk upsert /
 * mget) belong to the service.
 */
export type StepIoStateAccessor = Pick<WorkflowExecutionState, 'getStepExecution' | 'getLatestStepExecution' | 'getAllStepExecutions' | 'getStepExecutionIdsByStepId' | 'getWorkflowExecutionStatus' | 'getWorkflowExecutionId' | 'getWorkflowExecutionScopeStack' | 'getWorkflowExecutionStepExecutionIds' | 'drainPendingStepChanges' | 'ingestLoadedStepDocs' | 'flushWorkflowDoc'>;
/**
 * In-memory step/workflow document store with deferred ES persistence.
 *
 * Owns step *metadata* (status, scopeStack, error, indices, etc.) and the
 * workflow-level document. **Does not own `input` / `output`** — those live
 * in `StepIoService`, which:
 *   - holds the canonical IO maps,
 *   - drives the step-execution bulk-upsert (merging state's lifecycle
 *     partials with its own IO partials),
 *   - owns eviction / rehydration.
 *
 * The dependency is strictly one-way: state → workflowExecutionRepository;
 * service → state (via the structural `StepIoStateAccessor` type) and
 * stepExecutionRepository.
 */
export declare class WorkflowExecutionState {
    private workflowExecutionRepository;
    private stepExecutions;
    private workflowExecution;
    private workflowDocumentChanges;
    private stepDocumentsChanges;
    private lastFailedStepContext;
    /**
     * Maps step IDs to their execution IDs in chronological order. Enables
     * efficient lookup of all executions for a step that runs multiple times
     * (loops, retries).
     */
    private stepIdExecutionIdIndex;
    constructor(initialWorkflowExecution: EsWorkflowExecution, workflowExecutionRepository: WorkflowExecutionRepository);
    getWorkflowExecution(): EsWorkflowExecution;
    getWorkflowExecutionStatus(): EsWorkflowExecution['status'];
    getWorkflowExecutionId(): string;
    getWorkflowExecutionScopeStack(): EsWorkflowExecution['scopeStack'];
    getWorkflowExecutionStepExecutionIds(): string[] | undefined;
    getStepExecutionIdsByStepId(stepId: string): ReadonlyArray<string> | undefined;
    setLastFailedStepContext(ctx: FailedStepContext): void;
    getLastFailedStepContext(): FailedStepContext | undefined;
    updateWorkflowExecution(workflowExecution: Partial<EsWorkflowExecution>): void;
    getAllStepExecutions(): StepExecutionMetadata[];
    getStepExecution(stepExecutionId: string): StepExecutionMetadata | undefined;
    /**
     * Retrieves all executions for a workflow step in chronological order.
     * Returns `[]` when the step has not executed yet.
     *
     * Skips IDs missing from the canonical map (rather than asserting them
     * with a cast). The index and the canonical map are kept in sync by
     * `createStep` / `buildStepIdExecutionIdIndex`, but a defensive skip
     * keeps a future bug from surfacing as a downstream `undefined`.
     */
    getStepExecutionsByStepId(stepId: string): StepExecutionMetadata[];
    getLatestStepExecution(stepId: string): StepExecutionMetadata | undefined;
    /**
     * Records a step-metadata change. `input` / `output` are *not* permitted
     * here — those flow through `StepIoService.setStepInput` /
     * `setStepOutput`. The compile-time `Omit` already excludes them; this
     * runtime guard catches stray callers that bypass typing via casts.
     */
    upsertStep(step: Partial<StepExecutionMetadata>): void;
    /**
     * Drains pending step-document changes. Returns a `Map<id, partial>` whose
     * values are pure metadata (no `input` / `output`). The caller (the IO
     * service) merges this with its own IO partials and runs the combined
     * `bulkUpsert`. Returns an empty map when nothing is pending.
     */
    drainPendingStepChanges(): Map<string, Partial<StepExecutionMetadata>>;
    /**
     * Ingests step docs loaded from ES at resume time. The caller (the IO
     * service) is responsible for stripping `output` (and ingesting it into
     * its own IO map for pinned step types). State stores the metadata only.
     */
    ingestLoadedStepDocs(steps: ReadonlyArray<StepExecutionMetadata>): void;
    flushWorkflowDoc(): Promise<void>;
    private createStep;
    private updateStep;
    private buildStepIdExecutionIdIndex;
}
