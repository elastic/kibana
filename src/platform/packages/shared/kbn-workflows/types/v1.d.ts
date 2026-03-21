import type { JsonValue } from '@kbn/utility-types';
import { z } from '@kbn/zod/v4';
import type { SerializedError, WorkflowYaml } from '../spec/schema';
export declare enum ExecutionStatus {
    PENDING = "pending",
    WAITING = "waiting",
    WAITING_FOR_INPUT = "waiting_for_input",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    TIMED_OUT = "timed_out",
    SKIPPED = "skipped"
}
export type ExecutionStatusUnion = `${ExecutionStatus}`;
export declare const ExecutionStatusValues: ExecutionStatus[];
export declare const TerminalExecutionStatuses: readonly ExecutionStatus[];
export declare const NonTerminalExecutionStatuses: readonly ExecutionStatus[];
export declare enum ExecutionType {
    TEST = "test",
    PRODUCTION = "production"
}
export type ExecutionTypeUnion = `${ExecutionType}`;
export declare const ExecutionTypeValues: ExecutionType[];
/**
 * An interface representing the state of a step scope during workflow execution.
 */
export interface ScopeEntry {
    /**
     * Node that entered this scope.
     * Examples: enterForeach_step1, enterRetry_step1, etc
     */
    nodeId: string;
    nodeType: string;
    /**
     * Optional unique identifier for the scope instance.
     * For example, iteration identifier (0,1,2,3,etc), retry attempt identifier (attempt-1, attempt-2, etc), and so on
     */
    scopeId?: string;
}
export interface StackFrame {
    /** Step that created this frame */
    stepId: string;
    /** Scope entries within this frame */
    nestedScopes: ScopeEntry[];
}
export interface QueueMetrics {
    scheduledAt?: string;
    runAt?: string;
    startedAt: string;
    queueDelayMs: number | null;
    scheduleDelayMs: number | null;
}
export interface EsWorkflowExecution {
    spaceId: string;
    id: string;
    workflowId: string;
    isTestRun: boolean;
    status: ExecutionStatus;
    context: Record<string, any>;
    workflowDefinition: WorkflowYaml;
    yaml: string;
    currentNodeId?: string;
    /** If specified, the only this step and its children will be executed */
    stepId?: string;
    scopeStack: StackFrame[];
    createdAt: string;
    error: SerializedError | null;
    createdBy?: string;
    executedBy?: string;
    startedAt: string;
    finishedAt: string;
    cancelRequested: boolean;
    cancellationReason?: string;
    cancelledAt?: string;
    cancelledBy?: string;
    duration: number;
    triggeredBy?: string;
    taskRunAt?: string | null;
    traceId?: string;
    entryTransactionId?: string;
    concurrencyGroupKey?: string;
    queueMetrics?: QueueMetrics;
    /** IDs of all step executions, enables O(1) mget lookup instead of search */
    stepExecutionIds?: string[];
    /** Caller-supplied execution metadata, separate from workflow inputs */
    metadata?: Record<string, unknown>;
}
export interface ProviderInput {
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    defaultValue?: string | number | boolean;
}
export interface Provider {
    type: string;
    action: (stepInputs?: Record<string, unknown>) => Promise<Record<string, unknown> | void>;
    inputsDefinition: Record<string, ProviderInput>;
}
export interface EsWorkflowStepExecution {
    spaceId: string;
    id: string;
    stepId: string;
    stepType?: string;
    /** Current step's stack frames. */
    scopeStack: StackFrame[];
    workflowRunId: string;
    workflowId: string;
    status: ExecutionStatus;
    /** Whether this step execution belongs to a test run of the workflow. */
    isTestRun?: boolean;
    startedAt: string;
    finishedAt?: string;
    executionTimeMs?: number;
    /** Topological index of step in workflow graph. */
    topologicalIndex: number;
    /** Overall execution index in the entire workflow. */
    globalExecutionIndex: number;
    /**
     * Execution index within specific stepId.
     * There might be several instances of the same stepId if it's inside loops, retries, etc.
     */
    stepExecutionIndex: number;
    error?: SerializedError;
    output?: JsonValue;
    input?: JsonValue;
    /** Specific step execution instance state. Used by loops, retries, etc to track execution context. */
    state?: Record<string, unknown>;
}
export type WorkflowStepExecutionDto = Omit<EsWorkflowStepExecution, 'spaceId'>;
export interface WorkflowExecutionHistoryModel {
    id: string;
    workflowId?: string;
    workflowName?: string;
    status: ExecutionStatus;
    startedAt: string;
    finishedAt: string;
    duration: number | null;
}
export interface WorkflowExecutionLogModel {
    spaceId: string;
    timestamp: string;
    message: string;
    level: string;
}
export interface WorkflowExecutionDto {
    spaceId: string;
    id: string;
    status: ExecutionStatus;
    isTestRun: boolean;
    startedAt: string;
    error: SerializedError | null;
    finishedAt: string;
    workflowId?: string;
    workflowName?: string;
    workflowDefinition: WorkflowYaml;
    /** If specified, only this step and its children were executed */
    stepId?: string | undefined;
    stepExecutions: WorkflowStepExecutionDto[];
    duration: number | null;
    executedBy?: string;
    triggeredBy?: string;
    yaml: string;
    context?: Record<string, unknown>;
    traceId?: string;
    entryTransactionId?: string;
}
export type WorkflowExecutionListItemDto = Omit<WorkflowExecutionDto, 'stepExecutions' | 'yaml' | 'workflowDefinition'>;
export interface WorkflowExecutionListDto {
    results: WorkflowExecutionListItemDto[];
    page: number;
    size: number;
    total: number;
}
export declare const EsWorkflowSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    enabled: z.ZodBoolean;
    tags: z.ZodArray<z.ZodString>;
    createdAt: z.ZodDate;
    createdBy: z.ZodString;
    lastUpdatedAt: z.ZodDate;
    lastUpdatedBy: z.ZodString;
    definition: z.ZodOptional<z.ZodPipe<z.ZodObject<{
        version: z.ZodDefault<z.ZodOptional<z.ZodLiteral<"1">>>;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        settings: z.ZodOptional<z.ZodObject<{
            'on-failure': z.ZodOptional<z.ZodObject<{
                retry: z.ZodOptional<z.ZodObject<{
                    'max-attempts': z.ZodNumber;
                    condition: z.ZodOptional<z.ZodString>;
                    delay: z.ZodOptional<z.ZodString>;
                    strategy: z.ZodOptional<z.ZodEnum<{
                        fixed: "fixed";
                        exponential: "exponential";
                    }>>;
                    multiplier: z.ZodOptional<z.ZodNumber>;
                    'max-delay': z.ZodOptional<z.ZodString>;
                    jitter: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strip>>;
                fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                    type: z.ZodString;
                    'max-step-size': z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
                continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
            }, z.core.$strip>>;
            timezone: z.ZodOptional<z.ZodString>;
            timeout: z.ZodOptional<z.ZodString>;
            concurrency: z.ZodOptional<z.ZodObject<{
                key: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    drop: "drop";
                    "cancel-in-progress": "cancel-in-progress";
                }>>;
                max: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            'max-step-size': z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        enabled: z.ZodDefault<z.ZodBoolean>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        inputs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodOptional<z.ZodLiteral<"object">>;
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            $ref: z.ZodOptional<z.ZodString>;
            properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("../spec/schema/common/json_model_shape_schema").JsonSchema, unknown, z.core.$ZodTypeInternals<import("../spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>>;
            additionalProperties: z.ZodOptional<z.ZodBoolean>;
            required: z.ZodOptional<z.ZodArray<z.ZodString>>;
            definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("../spec/schema/common/json_model_shape_schema").JsonSchema, unknown, z.core.$ZodTypeInternals<import("../spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>>;
            $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("../spec/schema/common/json_model_shape_schema").JsonSchema, unknown, z.core.$ZodTypeInternals<import("../spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>>;
        }, z.core.$strip>, z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"string">;
            default: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"number">;
            default: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"boolean">;
            default: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"choice">;
            default: z.ZodOptional<z.ZodString>;
            options: z.ZodArray<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"array">;
            minItems: z.ZodOptional<z.ZodNumber>;
            maxItems: z.ZodOptional<z.ZodNumber>;
            default: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodArray<z.ZodNumber>, z.ZodArray<z.ZodBoolean>]>>;
        }, z.core.$strip>]>>]>>;
        outputs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodOptional<z.ZodLiteral<"object">>;
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            $ref: z.ZodOptional<z.ZodString>;
            properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("../spec/schema/common/json_model_shape_schema").JsonSchema, unknown, z.core.$ZodTypeInternals<import("../spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>>;
            additionalProperties: z.ZodOptional<z.ZodBoolean>;
            required: z.ZodOptional<z.ZodArray<z.ZodString>>;
            definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("../spec/schema/common/json_model_shape_schema").JsonSchema, unknown, z.core.$ZodTypeInternals<import("../spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>>;
            $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("../spec/schema/common/json_model_shape_schema").JsonSchema, unknown, z.core.$ZodTypeInternals<import("../spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>>;
        }, z.core.$strip>, z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"string">;
            default: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"number">;
            default: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"boolean">;
            default: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"choice">;
            default: z.ZodOptional<z.ZodString>;
            options: z.ZodArray<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"array">;
            minItems: z.ZodOptional<z.ZodNumber>;
            maxItems: z.ZodOptional<z.ZodNumber>;
            default: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodArray<z.ZodNumber>, z.ZodArray<z.ZodBoolean>]>>;
        }, z.core.$strip>]>>]>>;
        consts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodObject<{}, z.core.$strip>, z.ZodArray<z.ZodAny>]>>>;
        steps: z.ZodArray<z.ZodLazy<z.ZodUnion<readonly [z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            timeout: z.ZodOptional<z.ZodString>;
            'max-iterations': z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
                limit: z.ZodNumber;
                'on-limit': z.ZodEnum<{
                    continue: "continue";
                    fail: "fail";
                }>;
            }, z.core.$strip>]>>;
            'iteration-timeout': z.ZodOptional<z.ZodString>;
            'iteration-on-failure': z.ZodOptional<z.ZodObject<{
                retry: z.ZodOptional<z.ZodObject<{
                    'max-attempts': z.ZodNumber;
                    condition: z.ZodOptional<z.ZodString>;
                    delay: z.ZodOptional<z.ZodString>;
                    strategy: z.ZodOptional<z.ZodEnum<{
                        fixed: "fixed";
                        exponential: "exponential";
                    }>>;
                    multiplier: z.ZodOptional<z.ZodNumber>;
                    'max-delay': z.ZodOptional<z.ZodString>;
                    jitter: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strip>>;
                fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                    type: z.ZodString;
                    'max-step-size': z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
                continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
            }, z.core.$strip>>;
            if: z.ZodOptional<z.ZodString>;
            foreach: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>;
            steps: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            type: z.ZodLiteral<"foreach">;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            timeout: z.ZodOptional<z.ZodString>;
            'max-iterations': z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
                limit: z.ZodNumber;
                'on-limit': z.ZodEnum<{
                    continue: "continue";
                    fail: "fail";
                }>;
            }, z.core.$strip>]>>;
            'iteration-timeout': z.ZodOptional<z.ZodString>;
            'iteration-on-failure': z.ZodOptional<z.ZodObject<{
                retry: z.ZodOptional<z.ZodObject<{
                    'max-attempts': z.ZodNumber;
                    condition: z.ZodOptional<z.ZodString>;
                    delay: z.ZodOptional<z.ZodString>;
                    strategy: z.ZodOptional<z.ZodEnum<{
                        fixed: "fixed";
                        exponential: "exponential";
                    }>>;
                    multiplier: z.ZodOptional<z.ZodNumber>;
                    'max-delay': z.ZodOptional<z.ZodString>;
                    jitter: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strip>>;
                fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                    type: z.ZodString;
                    'max-step-size': z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
                continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
            }, z.core.$strip>>;
            if: z.ZodOptional<z.ZodString>;
            condition: z.ZodString;
            steps: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            type: z.ZodLiteral<"while">;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            condition: z.ZodString;
            steps: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            else: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            type: z.ZodLiteral<"if">;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            timeout: z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
            expression: z.ZodString;
            cases: z.ZodArray<z.ZodObject<{
                match: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                steps: z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                    type: z.ZodString;
                    'max-step-size': z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
            }, z.core.$strip>>;
            default: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            type: z.ZodLiteral<"switch">;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"wait">;
            with: z.ZodObject<{
                duration: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"waitForInput">;
            with: z.ZodOptional<z.ZodObject<{
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"data.set">;
            with: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            type: z.ZodString;
            with: z.ZodUnion<readonly [z.ZodObject<{
                request: z.ZodObject<{
                    method: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
                        POST: "POST";
                        DELETE: "DELETE";
                        PUT: "PUT";
                        GET: "GET";
                        HEAD: "HEAD";
                        PATCH: "PATCH";
                    }>>>;
                    path: z.ZodString;
                    body: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>;
            }, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
                index: z.ZodOptional<z.ZodString>;
                id: z.ZodOptional<z.ZodString>;
                query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                size: z.ZodOptional<z.ZodNumber>;
                from: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodArray<z.ZodAny>>;
                _source: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodArray<z.ZodString>, z.ZodString]>>;
                aggs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                aggregations: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, z.core.$strip>, z.ZodRecord<z.ZodString, z.ZodAny>>]>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            type: z.ZodString;
            with: z.ZodUnion<readonly [z.ZodObject<{
                use_server_info: z.ZodOptional<z.ZodBoolean>;
                use_localhost: z.ZodOptional<z.ZodBoolean>;
                debug: z.ZodOptional<z.ZodBoolean>;
                request: z.ZodObject<{
                    method: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
                        POST: "POST";
                        DELETE: "DELETE";
                        PUT: "PUT";
                        GET: "GET";
                        HEAD: "HEAD";
                        PATCH: "PATCH";
                    }>>>;
                    path: z.ZodString;
                    body: z.ZodOptional<z.ZodAny>;
                    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                }, z.core.$strip>;
                fetcher: z.ZodOptional<z.ZodObject<{
                    skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
                    follow_redirects: z.ZodOptional<z.ZodBoolean>;
                    max_redirects: z.ZodOptional<z.ZodNumber>;
                    keep_alive: z.ZodOptional<z.ZodBoolean>;
                    max_content_length: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
                use_server_info: z.ZodOptional<z.ZodBoolean>;
                use_localhost: z.ZodOptional<z.ZodBoolean>;
                debug: z.ZodOptional<z.ZodBoolean>;
                title: z.ZodOptional<z.ZodString>;
                description: z.ZodOptional<z.ZodString>;
                tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
                severity: z.ZodOptional<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    medium: "medium";
                    critical: "critical";
                }>>;
                assignees: z.ZodOptional<z.ZodArray<z.ZodString>>;
                owner: z.ZodOptional<z.ZodString>;
                connector: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                id: z.ZodOptional<z.ZodString>;
                case_id: z.ZodOptional<z.ZodString>;
                space_id: z.ZodOptional<z.ZodString>;
                page: z.ZodOptional<z.ZodNumber>;
                perPage: z.ZodOptional<z.ZodNumber>;
                status: z.ZodOptional<z.ZodString>;
                fetcher: z.ZodOptional<z.ZodObject<{
                    skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
                    follow_redirects: z.ZodOptional<z.ZodBoolean>;
                    max_redirects: z.ZodOptional<z.ZodNumber>;
                    keep_alive: z.ZodOptional<z.ZodBoolean>;
                    max_content_length: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodRecord<z.ZodString, z.ZodAny>>]>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            branches: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                steps: z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                    type: z.ZodString;
                    'max-step-size': z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
            }, z.core.$strip>>;
            type: z.ZodLiteral<"parallel">;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            sources: z.ZodArray<z.ZodString>;
            steps: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            type: z.ZodLiteral<"merge">;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            with: z.ZodObject<{
                'workflow-id': z.ZodString;
                inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.core.$strip>;
            type: z.ZodLiteral<"workflow.execute">;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            with: z.ZodObject<{
                'workflow-id': z.ZodString;
                inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.core.$strip>;
            type: z.ZodLiteral<"workflow.executeAsync">;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"workflow.output">;
            status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
                failed: "failed";
                cancelled: "cancelled";
                completed: "completed";
            }>>>;
            with: z.ZodRecord<z.ZodString, z.ZodAny>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"workflow.fail">;
            with: z.ZodOptional<z.ZodObject<{
                message: z.ZodOptional<z.ZodString>;
                reason: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"loop.break">;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"loop.continue">;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            type: z.ZodString;
            with: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            if: z.ZodOptional<z.ZodString>;
            foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
            timeout: z.ZodOptional<z.ZodString>;
            'on-failure': z.ZodOptional<z.ZodObject<{
                retry: z.ZodOptional<z.ZodObject<{
                    'max-attempts': z.ZodNumber;
                    condition: z.ZodOptional<z.ZodString>;
                    delay: z.ZodOptional<z.ZodString>;
                    strategy: z.ZodOptional<z.ZodEnum<{
                        fixed: "fixed";
                        exponential: "exponential";
                    }>>;
                    multiplier: z.ZodOptional<z.ZodNumber>;
                    'max-delay': z.ZodOptional<z.ZodString>;
                    jitter: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strip>>;
                fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                    type: z.ZodString;
                    'max-step-size': z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
                continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
            }, z.core.$strip>>;
        }, z.core.$strip>]>>>;
        triggers: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            type: z.ZodLiteral<"alert">;
            with: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                rule_id: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                rule_name: z.ZodString;
            }, z.core.$strip>]>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"scheduled">;
            with: z.ZodUnion<readonly [z.ZodObject<{
                every: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                rrule: z.ZodObject<{
                    freq: z.ZodEnum<{
                        DAILY: "DAILY";
                        WEEKLY: "WEEKLY";
                        MONTHLY: "MONTHLY";
                    }>;
                    interval: z.ZodNumber;
                    tzid: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
                        [x: string]: string;
                    }>>>;
                    dtstart: z.ZodOptional<z.ZodString>;
                    byhour: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
                    byminute: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
                    byweekday: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                        TH: "TH";
                        MO: "MO";
                        TU: "TU";
                        WE: "WE";
                        FR: "FR";
                        SA: "SA";
                        SU: "SU";
                    }>>>;
                    bymonthday: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
                }, z.core.$strip>;
            }, z.core.$strip>]>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"manual">;
        }, z.core.$strip>]>>;
    }, z.core.$strip>, z.ZodTransform<{
        outputs?: {
            type?: "object" | undefined;
            title?: string | undefined;
            description?: string | undefined;
            $ref?: string | undefined;
            properties?: Record<string, import("../spec/schema/common/json_model_shape_schema").JsonSchema> | undefined;
            additionalProperties?: boolean | undefined;
            required?: string[] | undefined;
            definitions?: Record<string, import("../spec/schema/common/json_model_shape_schema").JsonSchema> | undefined;
            $defs?: Record<string, import("../spec/schema/common/json_model_shape_schema").JsonSchema> | undefined;
        } | undefined;
        inputs?: {
            type?: "object" | undefined;
            title?: string | undefined;
            description?: string | undefined;
            $ref?: string | undefined;
            properties?: Record<string, import("../spec/schema/common/json_model_shape_schema").JsonSchema> | undefined;
            additionalProperties?: boolean | undefined;
            required?: string[] | undefined;
            definitions?: Record<string, import("../spec/schema/common/json_model_shape_schema").JsonSchema> | undefined;
            $defs?: Record<string, import("../spec/schema/common/json_model_shape_schema").JsonSchema> | undefined;
        } | undefined;
        version: "1";
        name: string;
        enabled: boolean;
        steps: ({
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            with?: Record<string, any> | undefined;
            if?: string | undefined;
            foreach?: string | unknown[] | undefined;
            timeout?: string | undefined;
            'on-failure'?: {
                retry?: {
                    'max-attempts': number;
                    condition?: string | undefined;
                    delay?: string | undefined;
                    strategy?: "fixed" | "exponential" | undefined;
                    multiplier?: number | undefined;
                    'max-delay'?: string | undefined;
                    jitter?: boolean | undefined;
                } | undefined;
                fallback?: {
                    name: string;
                    type: string;
                    'max-step-size'?: string | undefined;
                }[] | undefined;
                continue?: string | boolean | undefined;
            } | undefined;
        } | {
            name: string;
            type: "wait";
            with: {
                duration: string;
            };
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            type: "waitForInput";
            'max-step-size'?: string | undefined;
            with?: {
                message?: string | undefined;
            } | undefined;
        } | {
            name: string;
            type: "data.set";
            with: Record<string, unknown>;
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            type: string;
            with: ({
                index?: string | undefined;
                id?: string | undefined;
                query?: Record<string, any> | undefined;
                body?: Record<string, any> | undefined;
                size?: number | undefined;
                from?: number | undefined;
                sort?: any[] | undefined;
                _source?: string | boolean | string[] | undefined;
                aggs?: Record<string, any> | undefined;
                aggregations?: Record<string, any> | undefined;
            } & Record<string, any>) | {
                request: {
                    method: "POST" | "DELETE" | "PUT" | "GET" | "HEAD" | "PATCH";
                    path: string;
                    body?: any;
                };
            };
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            type: string;
            with: ({
                use_server_info?: boolean | undefined;
                use_localhost?: boolean | undefined;
                debug?: boolean | undefined;
                title?: string | undefined;
                description?: string | undefined;
                tags?: string[] | undefined;
                severity?: "high" | "low" | "medium" | "critical" | undefined;
                assignees?: string[] | undefined;
                owner?: string | undefined;
                connector?: Record<string, any> | undefined;
                settings?: Record<string, any> | undefined;
                id?: string | undefined;
                case_id?: string | undefined;
                space_id?: string | undefined;
                page?: number | undefined;
                perPage?: number | undefined;
                status?: string | undefined;
                fetcher?: {
                    skip_ssl_verification?: boolean | undefined;
                    follow_redirects?: boolean | undefined;
                    max_redirects?: number | undefined;
                    keep_alive?: boolean | undefined;
                    max_content_length?: number | undefined;
                } | undefined;
            } & Record<string, any>) | {
                request: {
                    method: "POST" | "DELETE" | "PUT" | "GET" | "HEAD" | "PATCH";
                    path: string;
                    body?: any;
                    headers?: Record<string, string> | undefined;
                };
                use_server_info?: boolean | undefined;
                use_localhost?: boolean | undefined;
                debug?: boolean | undefined;
                fetcher?: {
                    skip_ssl_verification?: boolean | undefined;
                    follow_redirects?: boolean | undefined;
                    max_redirects?: number | undefined;
                    keep_alive?: boolean | undefined;
                    max_content_length?: number | undefined;
                } | undefined;
            };
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            foreach: string | unknown[];
            steps: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
            }[];
            type: "foreach";
            'max-step-size'?: string | undefined;
            timeout?: string | undefined;
            'max-iterations'?: number | {
                limit: number;
                'on-limit': "continue" | "fail";
            } | undefined;
            'iteration-timeout'?: string | undefined;
            'iteration-on-failure'?: {
                retry?: {
                    'max-attempts': number;
                    condition?: string | undefined;
                    delay?: string | undefined;
                    strategy?: "fixed" | "exponential" | undefined;
                    multiplier?: number | undefined;
                    'max-delay'?: string | undefined;
                    jitter?: boolean | undefined;
                } | undefined;
                fallback?: {
                    name: string;
                    type: string;
                    'max-step-size'?: string | undefined;
                }[] | undefined;
                continue?: string | boolean | undefined;
            } | undefined;
            if?: string | undefined;
        } | {
            name: string;
            condition: string;
            steps: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
            }[];
            type: "while";
            'max-step-size'?: string | undefined;
            timeout?: string | undefined;
            'max-iterations'?: number | {
                limit: number;
                'on-limit': "continue" | "fail";
            } | undefined;
            'iteration-timeout'?: string | undefined;
            'iteration-on-failure'?: {
                retry?: {
                    'max-attempts': number;
                    condition?: string | undefined;
                    delay?: string | undefined;
                    strategy?: "fixed" | "exponential" | undefined;
                    multiplier?: number | undefined;
                    'max-delay'?: string | undefined;
                    jitter?: boolean | undefined;
                } | undefined;
                fallback?: {
                    name: string;
                    type: string;
                    'max-step-size'?: string | undefined;
                }[] | undefined;
                continue?: string | boolean | undefined;
            } | undefined;
            if?: string | undefined;
        } | {
            name: string;
            expression: string;
            cases: {
                match: string | number | boolean;
                steps: {
                    name: string;
                    type: string;
                    'max-step-size'?: string | undefined;
                }[];
            }[];
            type: "switch";
            'max-step-size'?: string | undefined;
            timeout?: string | undefined;
            if?: string | undefined;
            default?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
            }[] | undefined;
        } | {
            name: string;
            condition: string;
            steps: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
            }[];
            type: "if";
            'max-step-size'?: string | undefined;
            else?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
            }[] | undefined;
        } | {
            name: string;
            branches: {
                name: string;
                steps: {
                    name: string;
                    type: string;
                    'max-step-size'?: string | undefined;
                }[];
            }[];
            type: "parallel";
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            sources: string[];
            steps: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
            }[];
            type: "merge";
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            type: "loop.break";
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        } | {
            name: string;
            type: "loop.continue";
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        } | {
            name: string;
            with: {
                'workflow-id': string;
                inputs?: Record<string, unknown> | undefined;
            };
            type: "workflow.execute";
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            with: {
                'workflow-id': string;
                inputs?: Record<string, unknown> | undefined;
            };
            type: "workflow.executeAsync";
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            type: "workflow.output";
            status: "failed" | "cancelled" | "completed";
            with: Record<string, any>;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        } | {
            name: string;
            type: "workflow.fail";
            'max-step-size'?: string | undefined;
            with?: {
                message?: string | undefined;
                reason?: string | undefined;
            } | undefined;
            if?: string | undefined;
        })[];
        triggers: ({
            type: "alert";
            with?: {
                rule_id: string;
            } | {
                rule_name: string;
            } | undefined;
        } | {
            type: "scheduled";
            with: {
                every: string;
            } | {
                rrule: {
                    freq: "DAILY" | "WEEKLY" | "MONTHLY";
                    interval: number;
                    tzid: string;
                    dtstart?: string | undefined;
                    byhour?: number[] | undefined;
                    byminute?: number[] | undefined;
                    byweekday?: ("TH" | "MO" | "TU" | "WE" | "FR" | "SA" | "SU")[] | undefined;
                    bymonthday?: number[] | undefined;
                };
            };
        } | {
            type: "manual";
        })[];
        description?: string | undefined;
        settings?: {
            'on-failure'?: {
                retry?: {
                    'max-attempts': number;
                    condition?: string | undefined;
                    delay?: string | undefined;
                    strategy?: "fixed" | "exponential" | undefined;
                    multiplier?: number | undefined;
                    'max-delay'?: string | undefined;
                    jitter?: boolean | undefined;
                } | undefined;
                fallback?: {
                    name: string;
                    type: string;
                    'max-step-size'?: string | undefined;
                }[] | undefined;
                continue?: string | boolean | undefined;
            } | undefined;
            timezone?: string | undefined;
            timeout?: string | undefined;
            concurrency?: {
                key?: string | undefined;
                strategy?: "drop" | "cancel-in-progress" | undefined;
                max?: number | undefined;
            } | undefined;
            'max-step-size'?: string | undefined;
        } | undefined;
        tags?: string[] | undefined;
        consts?: Record<string, string | number | boolean | any[] | Record<string, any> | Record<string, never>> | undefined;
    }, {
        version: "1";
        name: string;
        enabled: boolean;
        steps: ({
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            with?: Record<string, any> | undefined;
            if?: string | undefined;
            foreach?: string | unknown[] | undefined;
            timeout?: string | undefined;
            'on-failure'?: {
                retry?: {
                    'max-attempts': number;
                    condition?: string | undefined;
                    delay?: string | undefined;
                    strategy?: "fixed" | "exponential" | undefined;
                    multiplier?: number | undefined;
                    'max-delay'?: string | undefined;
                    jitter?: boolean | undefined;
                } | undefined;
                fallback?: {
                    name: string;
                    type: string;
                    'max-step-size'?: string | undefined;
                }[] | undefined;
                continue?: string | boolean | undefined;
            } | undefined;
        } | {
            name: string;
            type: "wait";
            with: {
                duration: string;
            };
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            type: "waitForInput";
            'max-step-size'?: string | undefined;
            with?: {
                message?: string | undefined;
            } | undefined;
        } | {
            name: string;
            type: "data.set";
            with: Record<string, unknown>;
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            type: string;
            with: ({
                index?: string | undefined;
                id?: string | undefined;
                query?: Record<string, any> | undefined;
                body?: Record<string, any> | undefined;
                size?: number | undefined;
                from?: number | undefined;
                sort?: any[] | undefined;
                _source?: string | boolean | string[] | undefined;
                aggs?: Record<string, any> | undefined;
                aggregations?: Record<string, any> | undefined;
            } & Record<string, any>) | {
                request: {
                    method: "POST" | "DELETE" | "PUT" | "GET" | "HEAD" | "PATCH";
                    path: string;
                    body?: any;
                };
            };
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            type: string;
            with: ({
                use_server_info?: boolean | undefined;
                use_localhost?: boolean | undefined;
                debug?: boolean | undefined;
                title?: string | undefined;
                description?: string | undefined;
                tags?: string[] | undefined;
                severity?: "high" | "low" | "medium" | "critical" | undefined;
                assignees?: string[] | undefined;
                owner?: string | undefined;
                connector?: Record<string, any> | undefined;
                settings?: Record<string, any> | undefined;
                id?: string | undefined;
                case_id?: string | undefined;
                space_id?: string | undefined;
                page?: number | undefined;
                perPage?: number | undefined;
                status?: string | undefined;
                fetcher?: {
                    skip_ssl_verification?: boolean | undefined;
                    follow_redirects?: boolean | undefined;
                    max_redirects?: number | undefined;
                    keep_alive?: boolean | undefined;
                    max_content_length?: number | undefined;
                } | undefined;
            } & Record<string, any>) | {
                request: {
                    method: "POST" | "DELETE" | "PUT" | "GET" | "HEAD" | "PATCH";
                    path: string;
                    body?: any;
                    headers?: Record<string, string> | undefined;
                };
                use_server_info?: boolean | undefined;
                use_localhost?: boolean | undefined;
                debug?: boolean | undefined;
                fetcher?: {
                    skip_ssl_verification?: boolean | undefined;
                    follow_redirects?: boolean | undefined;
                    max_redirects?: number | undefined;
                    keep_alive?: boolean | undefined;
                    max_content_length?: number | undefined;
                } | undefined;
            };
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            foreach: string | unknown[];
            steps: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
            }[];
            type: "foreach";
            'max-step-size'?: string | undefined;
            timeout?: string | undefined;
            'max-iterations'?: number | {
                limit: number;
                'on-limit': "continue" | "fail";
            } | undefined;
            'iteration-timeout'?: string | undefined;
            'iteration-on-failure'?: {
                retry?: {
                    'max-attempts': number;
                    condition?: string | undefined;
                    delay?: string | undefined;
                    strategy?: "fixed" | "exponential" | undefined;
                    multiplier?: number | undefined;
                    'max-delay'?: string | undefined;
                    jitter?: boolean | undefined;
                } | undefined;
                fallback?: {
                    name: string;
                    type: string;
                    'max-step-size'?: string | undefined;
                }[] | undefined;
                continue?: string | boolean | undefined;
            } | undefined;
            if?: string | undefined;
        } | {
            name: string;
            condition: string;
            steps: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
            }[];
            type: "while";
            'max-step-size'?: string | undefined;
            timeout?: string | undefined;
            'max-iterations'?: number | {
                limit: number;
                'on-limit': "continue" | "fail";
            } | undefined;
            'iteration-timeout'?: string | undefined;
            'iteration-on-failure'?: {
                retry?: {
                    'max-attempts': number;
                    condition?: string | undefined;
                    delay?: string | undefined;
                    strategy?: "fixed" | "exponential" | undefined;
                    multiplier?: number | undefined;
                    'max-delay'?: string | undefined;
                    jitter?: boolean | undefined;
                } | undefined;
                fallback?: {
                    name: string;
                    type: string;
                    'max-step-size'?: string | undefined;
                }[] | undefined;
                continue?: string | boolean | undefined;
            } | undefined;
            if?: string | undefined;
        } | {
            name: string;
            expression: string;
            cases: {
                match: string | number | boolean;
                steps: {
                    name: string;
                    type: string;
                    'max-step-size'?: string | undefined;
                }[];
            }[];
            type: "switch";
            'max-step-size'?: string | undefined;
            timeout?: string | undefined;
            if?: string | undefined;
            default?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
            }[] | undefined;
        } | {
            name: string;
            condition: string;
            steps: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
            }[];
            type: "if";
            'max-step-size'?: string | undefined;
            else?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
            }[] | undefined;
        } | {
            name: string;
            branches: {
                name: string;
                steps: {
                    name: string;
                    type: string;
                    'max-step-size'?: string | undefined;
                }[];
            }[];
            type: "parallel";
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            sources: string[];
            steps: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
            }[];
            type: "merge";
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            type: "loop.break";
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        } | {
            name: string;
            type: "loop.continue";
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        } | {
            name: string;
            with: {
                'workflow-id': string;
                inputs?: Record<string, unknown> | undefined;
            };
            type: "workflow.execute";
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            with: {
                'workflow-id': string;
                inputs?: Record<string, unknown> | undefined;
            };
            type: "workflow.executeAsync";
            'max-step-size'?: string | undefined;
        } | {
            name: string;
            type: "workflow.output";
            status: "failed" | "cancelled" | "completed";
            with: Record<string, any>;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        } | {
            name: string;
            type: "workflow.fail";
            'max-step-size'?: string | undefined;
            with?: {
                message?: string | undefined;
                reason?: string | undefined;
            } | undefined;
            if?: string | undefined;
        })[];
        triggers: ({
            type: "alert";
            with?: {
                rule_id: string;
            } | {
                rule_name: string;
            } | undefined;
        } | {
            type: "scheduled";
            with: {
                every: string;
            } | {
                rrule: {
                    freq: "DAILY" | "WEEKLY" | "MONTHLY";
                    interval: number;
                    tzid: string;
                    dtstart?: string | undefined;
                    byhour?: number[] | undefined;
                    byminute?: number[] | undefined;
                    byweekday?: ("TH" | "MO" | "TU" | "WE" | "FR" | "SA" | "SU")[] | undefined;
                    bymonthday?: number[] | undefined;
                };
            };
        } | {
            type: "manual";
        })[];
        description?: string | undefined;
        settings?: {
            'on-failure'?: {
                retry?: {
                    'max-attempts': number;
                    condition?: string | undefined;
                    delay?: string | undefined;
                    strategy?: "fixed" | "exponential" | undefined;
                    multiplier?: number | undefined;
                    'max-delay'?: string | undefined;
                    jitter?: boolean | undefined;
                } | undefined;
                fallback?: {
                    name: string;
                    type: string;
                    'max-step-size'?: string | undefined;
                }[] | undefined;
                continue?: string | boolean | undefined;
            } | undefined;
            timezone?: string | undefined;
            timeout?: string | undefined;
            concurrency?: {
                key?: string | undefined;
                strategy?: "drop" | "cancel-in-progress" | undefined;
                max?: number | undefined;
            } | undefined;
            'max-step-size'?: string | undefined;
        } | undefined;
        tags?: string[] | undefined;
        inputs?: {
            type?: "object" | undefined;
            title?: string | undefined;
            description?: string | undefined;
            $ref?: string | undefined;
            properties?: Record<string, import("../spec/schema/common/json_model_shape_schema").JsonSchema> | undefined;
            additionalProperties?: boolean | undefined;
            required?: string[] | undefined;
            definitions?: Record<string, import("../spec/schema/common/json_model_shape_schema").JsonSchema> | undefined;
            $defs?: Record<string, import("../spec/schema/common/json_model_shape_schema").JsonSchema> | undefined;
        } | ({
            name: string;
            type: "string";
            description?: string | undefined;
            required?: boolean | undefined;
            default?: string | undefined;
        } | {
            name: string;
            type: "number";
            description?: string | undefined;
            required?: boolean | undefined;
            default?: number | undefined;
        } | {
            name: string;
            type: "boolean";
            description?: string | undefined;
            required?: boolean | undefined;
            default?: boolean | undefined;
        } | {
            name: string;
            type: "choice";
            options: string[];
            description?: string | undefined;
            required?: boolean | undefined;
            default?: string | undefined;
        } | {
            name: string;
            type: "array";
            description?: string | undefined;
            required?: boolean | undefined;
            minItems?: number | undefined;
            maxItems?: number | undefined;
            default?: number[] | string[] | boolean[] | undefined;
        })[] | undefined;
        outputs?: {
            type?: "object" | undefined;
            title?: string | undefined;
            description?: string | undefined;
            $ref?: string | undefined;
            properties?: Record<string, import("../spec/schema/common/json_model_shape_schema").JsonSchema> | undefined;
            additionalProperties?: boolean | undefined;
            required?: string[] | undefined;
            definitions?: Record<string, import("../spec/schema/common/json_model_shape_schema").JsonSchema> | undefined;
            $defs?: Record<string, import("../spec/schema/common/json_model_shape_schema").JsonSchema> | undefined;
        } | ({
            name: string;
            type: "string";
            description?: string | undefined;
            required?: boolean | undefined;
            default?: string | undefined;
        } | {
            name: string;
            type: "number";
            description?: string | undefined;
            required?: boolean | undefined;
            default?: number | undefined;
        } | {
            name: string;
            type: "boolean";
            description?: string | undefined;
            required?: boolean | undefined;
            default?: boolean | undefined;
        } | {
            name: string;
            type: "choice";
            options: string[];
            description?: string | undefined;
            required?: boolean | undefined;
            default?: string | undefined;
        } | {
            name: string;
            type: "array";
            description?: string | undefined;
            required?: boolean | undefined;
            minItems?: number | undefined;
            maxItems?: number | undefined;
            default?: number[] | string[] | boolean[] | undefined;
        })[] | undefined;
        consts?: Record<string, string | number | boolean | any[] | Record<string, any> | Record<string, never>> | undefined;
    }>>>;
    deleted_at: z.ZodDefault<z.ZodNullable<z.ZodDate>>;
    yaml: z.ZodString;
    valid: z.ZodReadonly<z.ZodBoolean>;
}, z.core.$strip>;
export type EsWorkflow = z.infer<typeof EsWorkflowSchema>;
export type EsWorkflowCreate = Omit<EsWorkflow, 'id' | 'createdAt' | 'createdBy' | 'lastUpdatedAt' | 'lastUpdatedBy' | 'yaml' | 'deleted_at'>;
export declare const CreateWorkflowCommandSchema: z.ZodObject<{
    yaml: z.ZodString;
    id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const BulkCreateWorkflowsCommandSchema: z.ZodObject<{
    workflows: z.ZodArray<z.ZodObject<{
        yaml: z.ZodString;
        id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type BulkCreateWorkflowsCommand = z.infer<typeof BulkCreateWorkflowsCommandSchema>;
export declare const UpdateWorkflowCommandSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    enabled: z.ZodBoolean;
    tags: z.ZodArray<z.ZodString>;
    yaml: z.ZodString;
}, z.core.$strip>;
export declare const SearchWorkflowCommandSchema: z.ZodObject<{
    triggerType: z.ZodOptional<z.ZodString>;
    size: z.ZodDefault<z.ZodNumber>;
    page: z.ZodDefault<z.ZodNumber>;
    createdBy: z.ZodOptional<z.ZodArray<z.ZodString>>;
    enabled: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodBoolean, z.ZodPipe<z.ZodNumber, z.ZodTransform<boolean, number>>]>>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    query: z.ZodOptional<z.ZodString>;
    _full: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const RunWorkflowCommandSchema: z.ZodObject<{
    inputs: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export type RunWorkflowCommand = z.infer<typeof RunWorkflowCommandSchema>;
export declare const RunStepCommandSchema: z.ZodObject<{
    workflowYaml: z.ZodString;
    workflowId: z.ZodOptional<z.ZodString>;
    stepId: z.ZodString;
    contextOverride: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type RunStepCommand = z.infer<typeof RunStepCommandSchema>;
export declare const TestWorkflowCommandSchema: z.ZodObject<{
    workflowYaml: z.ZodString;
    inputs: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export type TestWorkflowCommand = z.infer<typeof TestWorkflowCommandSchema>;
export declare const RunWorkflowResponseSchema: z.ZodObject<{
    workflowExecutionId: z.ZodString;
}, z.core.$strip>;
export type RunWorkflowResponseDto = z.infer<typeof RunWorkflowResponseSchema>;
export declare const TestWorkflowResponseSchema: z.ZodObject<{
    workflowExecutionId: z.ZodString;
}, z.core.$strip>;
export type TestWorkflowResponseDto = z.infer<typeof TestWorkflowResponseSchema>;
export type CreateWorkflowCommand = z.infer<typeof CreateWorkflowCommandSchema>;
export interface UpdatedWorkflowResponseDto {
    id: string;
    lastUpdatedAt: string;
    lastUpdatedBy: string | undefined;
    enabled: boolean;
    valid: boolean;
    validationErrors: string[];
}
export interface WorkflowDetailDto {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    createdAt: string;
    createdBy: string;
    lastUpdatedAt: string;
    lastUpdatedBy: string;
    definition: WorkflowYaml | null;
    yaml: string;
    valid: boolean;
}
export interface WorkflowListItemDto {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    definition: WorkflowYaml | null;
    createdAt: string;
    history: WorkflowExecutionHistoryModel[];
    tags?: string[];
    valid: boolean;
}
export interface WorkflowListDto {
    page: number;
    size: number;
    total: number;
    results: WorkflowListItemDto[];
}
export interface WorkflowExecutionEngineModel extends Pick<EsWorkflow, 'id' | 'name' | 'enabled' | 'definition' | 'yaml'> {
    isTestRun?: boolean;
    spaceId?: string;
}
export interface WorkflowListItemAction {
    isPrimary?: boolean;
    type: string;
    color: string;
    name: string;
    icon: string;
    description: string;
    onClick: (item: WorkflowListItemDto) => void;
}
export interface WorkflowExecutionsHistoryStats {
    date: string;
    timestamp: string;
    completed: number;
    failed: number;
    cancelled: number;
}
export interface WorkflowStatsDto {
    workflows: {
        enabled: number;
        disabled: number;
    };
    executions: WorkflowExecutionsHistoryStats[];
}
export interface WorkflowAggsDto {
    [key: string]: {
        key: string;
        label: string;
    }[];
}
export interface ConnectorSubAction {
    name: string;
    displayName: string;
}
export interface ConnectorInstance {
    id: string;
    name: string;
    isPreconfigured: boolean;
    isDeprecated: boolean;
    config?: ConnectorInstanceConfig;
}
export interface ConnectorInstanceConfig {
    taskType?: string;
}
export interface ConnectorTypeInfo {
    actionTypeId: string;
    displayName: string;
    instances: ConnectorInstance[];
    enabled: boolean;
    enabledInConfig: boolean;
    enabledInLicense: boolean;
    minimumLicenseRequired: string;
    subActions: ConnectorSubAction[];
}
export type CompletionFn = () => Promise<Array<{
    label: string;
    value: string;
    detail?: string;
    documentation?: string;
}>>;
export type StepStabilityLevel = 'stable' | 'beta' | 'tech_preview';
export interface BaseConnectorContract {
    type: string;
    paramsSchema: z.ZodType;
    hasConnectorId?: 'required' | 'optional' | false;
    outputSchema: z.ZodType;
    configSchema?: z.ZodObject;
    summary: string | null;
    description: string | null;
    /** Documentation URL for this API endpoint */
    documentation?: string | null;
    /** API stability level derived from the OpenAPI `x-state` field */
    stability?: StepStabilityLevel;
    examples?: ConnectorExamples;
    editorHandlers?: {
        config?: Record<string, StepPropertyHandler | undefined>;
        input?: Record<string, StepPropertyHandler | undefined>;
    };
}
export interface DynamicConnectorContract extends BaseConnectorContract {
    /** Action type ID from Kibana actions plugin */
    actionTypeId: string;
    /** Available connector instances */
    instances: ConnectorInstance[];
    /** Whether this connector type is enabled */
    enabled?: boolean;
    /** Whether this is a system action type */
    isSystemActionType?: boolean;
}
export declare const KNOWN_HTTP_METHODS: readonly ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export interface EnhancedInternalConnectorContract extends InternalConnectorContract {
    examples: ConnectorExamples;
}
export interface InternalConnectorContract extends BaseConnectorContract {
    /** HTTP method(s) for this API endpoint */
    methods: HttpMethod[];
    /** URL pattern(s) for this API endpoint */
    patterns: string[];
    /** Parameter type metadata for proper request building */
    parameterTypes: {
        headerParams: string[];
        pathParams: string[];
        urlParams: string[];
        bodyParams: string[];
    };
}
export interface StepPropertyHandler<T = unknown> {
    /**
     * Entity selection configuration for the property.
     * Provides a unified interface for search, resolution, and decoration of entity references.
     */
    selection?: PropertySelectionHandler<Exclude<T, undefined>>;
    /**
     * Connector ID selection configuration for the property.
     * Used to resolve connector IDs for custom steps.
     *
     * **Note**: This handler is currently only supported for the `connector-id` property in the config schema.
     */
    connectorIdSelection?: ConnectorIdSelectionHandler;
}
export interface PropertySelectionHandler<T = unknown> {
    /**
     * Search for options matching the input query.
     * Used by autocomplete dropdowns when the user types.
     */
    search: (input: string, context: SelectionContext) => Promise<SelectionOption<T>[]>;
    /**
     * Resolve an entity by its value.
     * Used when loading existing values or when a value is pasted.
     * Returns null if the entity is not found.
     */
    resolve: (value: T, context: SelectionContext) => Promise<SelectionOption<T> | null>;
    /**
     * Get detailed information for the current value.
     * Used for decoration and metadata display in the editor.
     * The option parameter is the resolved entity from `resolve`, if available.
     */
    getDetails: (input: string, context: SelectionContext, option: SelectionOption<T> | null) => Promise<SelectionDetails>;
}
export interface SelectionOption<T = unknown> {
    /** The value that will be stored in the YAML */
    value: T;
    /** The label displayed in the UI */
    label: string;
    /** Description shown in completion popup or tooltips (optional) */
    description?: string;
    /** Extended documentation shown in side panel (optional) */
    documentation?: string;
}
export interface SelectionDetails {
    /** Message to display (e.g., "✓ Agent connected" or "Agent not found") */
    message: string;
    /** Links to related actions (e.g., "Edit agent", "Create agent") */
    links?: Array<{
        /** Link text */
        text: string;
        /** Link path (relative or absolute URL) */
        path: string;
    }>;
}
export interface SelectionContext {
    /** The step type ID (e.g., "onechat.runAgent") */
    stepType: string;
    /** The property path ("config" or "input") */
    scope: 'config' | 'input';
    /** The property key (e.g., "agent_id") */
    propertyKey: string;
}
export interface ConnectorIdSelectionHandler {
    /**
     * The action type IDs to search for.
     */
    connectorTypes: string[];
    /**
     * Whether to disable creation of a new connector from the connector ID selection.
     * If false (default), creation from the connector ID selection will be disabled.
     * If true, creation from the connector ID selection will be enabled for the first type in the `connectorTypes` list.
     */
    enableCreation?: boolean;
}
export interface ConnectorExamples {
    params?: Record<string, string>;
    snippet?: string;
}
export type ConnectorContractUnion = DynamicConnectorContract | BaseConnectorContract | InternalConnectorContract;
export interface WorkflowsSearchParams {
    size: number;
    page: number;
    query?: string;
    createdBy?: string[];
    enabled?: boolean[];
    tags?: string[];
}
export interface RequestOptions {
    method: string;
    path: string;
    body?: Record<string, unknown>;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    /** Bulk body for elasticsearch.bulk step */
    bulkBody?: Array<Record<string, unknown>>;
}
