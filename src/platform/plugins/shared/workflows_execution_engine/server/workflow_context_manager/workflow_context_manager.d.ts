import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type StackFrame, type StepContext } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import type { StepIoService } from './step_io_service';
import type { ContextDependencies } from './types';
import type { WorkflowExecutionState } from './workflow_execution_state';
import { WorkflowScopeStack } from './workflow_scope_stack';
import type { WorkflowTemplatingEngine } from '../templating_engine';
export interface ContextManagerInit {
    templateEngine: WorkflowTemplatingEngine;
    workflowExecutionGraph: WorkflowGraph;
    workflowExecutionState: WorkflowExecutionState;
    stepIoService: StepIoService;
    node: GraphNodeUnion;
    stackFrames: StackFrame[];
    esClient: ElasticsearchClient;
    fakeRequest: KibanaRequest;
    coreStart: CoreStart;
    dependencies: ContextDependencies;
}
export declare class WorkflowContextManager {
    private workflowExecutionGraph;
    private workflowExecutionState;
    private stepIoService;
    private esClient;
    private templateEngine;
    private fakeRequest;
    private coreStart;
    private dependencies;
    private stackFrames;
    readonly node: GraphNodeUnion;
    /**
     * Cached predecessors for this node. Since `node` is readonly and the graph is immutable
     * during execution, the result of `getAllPredecessors` is constant for the lifetime of
     * the instance. Computed once on first access to avoid redundant O(V+E) DAG traversals
     * on every `getContext()` call (invoked 5-10x per step via renderValueAccordingToContext, etc.).
     */
    private predecessorsCache;
    private get predecessors();
    get scopeStack(): WorkflowScopeStack;
    constructor(init: ContextManagerInit);
    /**
     * Pre-warms the execution state by rehydrating any evicted step outputs
     * that will be needed by `getContext()`. Must be called before `getContext()`.
     *
     * This exists so that `getContext()` and all its synchronous callers
     * (`renderValueAccordingToContext`, `evaluateBooleanExpressionInContext`, etc.)
     * remain synchronous. When nothing has been evicted, this is a no-op with
     * zero overhead.
     */
    ensureContextReady(): Promise<void>;
    getContext(): StepContext;
    /**
     * Recursively resolves template expressions in any value (string, object, array, or primitive).
     *
     * This method traverses the input value and replaces all template expressions (e.g., `{{workflow.id}}`,
     * `{{steps.step1.output}}`) with their actual values from the current workflow execution context.
     *
     * @param obj - The value to render. Can be:
     *   - A string with template expressions: `"{{workflow.name}}"`
     *   - An object with string properties: `{ name: "{{workflow.name}}", id: "{{workflow.id}}" }`
     *   - An array: `["{{step1.output}}", "static value"]`
     *   - A nested structure combining any of the above
     *   - Primitive values (numbers, booleans) are returned as-is
     *
     * @returns The same type as the input, with all template expressions resolved to their actual values
     *
     * @example
     * ```typescript
     * // Render a simple string
     * const result = contextManager.renderValueAccordingToContext("Workflow: {{workflow.name}}");
     * // => "Workflow: My Workflow"
     *
     * // Render an object with templates
     * const config = contextManager.renderValueAccordingToContext({
     *   url: "{{steps.fetchData.output.apiUrl}}",
     *   headers: { "X-Request-Id": "{{execution.id}}" }
     * });
     * // => { url: "https://api.example.com", headers: { "X-Request-Id": "exec-123" } }
     * ```
     */
    renderValueAccordingToContext<T>(obj: T, additionalContext?: Record<string, unknown>): T;
    renderValueWithContext<T>(obj: T, context: Record<string, unknown>, additionalContext?: Record<string, unknown>): T;
    evaluateExpressionInContext(template: string): unknown;
    evaluateBooleanExpressionInContext(condition: string | boolean | undefined, additionalContext?: Record<string, unknown>): boolean;
    readContextPath(propertyPath: string): {
        pathExists: boolean;
        value: unknown;
    };
    /**
     * Get the Elasticsearch client for internal actions
     * This client is already user-scoped if fakeRequest was available during initialization
     */
    getEsClientAsUser(): ElasticsearchClient;
    getWorkflowSpaceId(): string;
    /**
     * Get the fake request from task manager for Kibana API authentication
     */
    getFakeRequest(): KibanaRequest;
    /**
     * Get CoreStart for accessing Kibana's internal services
     */
    getCoreStart(): CoreStart;
    /**
     * Get variables from all completed data.set steps in the workflow execution.
     * Variables are retrieved from step outputs, which are persisted in execution state.
     * This ensures variables survive across wait steps and task resumptions.
     * Steps are processed in execution order to ensure consistent variable assignment.
     */
    getVariables(): Record<string, unknown>;
    /**
     * Get dependencies
     */
    getDependencies(): ContextDependencies;
    private buildWorkflowContext;
    private getRenderingContext;
    private stackFramesAllowNarrowing;
    private getContextForVariableSegments;
    private populateReferencedStepPaths;
    private readValueAtPath;
    private writeValueAtPath;
    private enrichStepContextWithMockedData;
    private enrichStepContextAccordingToStepScope;
    /**
     * Builds the foreach context by combining the persisted state (index, total)
     * with items derived by re-evaluating the foreach expression at resolution time.
     * This avoids storing the entire items array in the step execution state on every iteration.
     */
    private buildForeachContext;
    private buildWhileContext;
    /**
     * Extracts the foreach expression string from a step execution's input.
     * The input is typed as JsonValue, so we narrow it to a record and pull the `foreach` key.
     */
    private extractForeachExpression;
    /**
     * Evaluates a foreach expression against the given context and returns the resulting array.
     * Mirrors the evaluation logic in EnterForeachNodeImpl.processForeachConfiguration / getItems.
     */
    private resolveForeachItems;
    private getStepData;
}
