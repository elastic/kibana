import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
declare const EventTriggersConfigSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * When false, event-driven workflow execution is disabled: event-triggered runs
     * (triggeredBy not in manual/scheduled/alert) are skipped at execution time.
     */
    enabled: import("@kbn/config-schema").Type<boolean>;
    /**
     * When false, trigger events are not logged to the trigger-events data stream.
     */
    logEvents: import("@kbn/config-schema").Type<boolean>;
    /**
     * Maximum depth for event-triggered chains (any workflow in the chain).
     * Scheduling is skipped when depth exceeds this value.
     */
    maxChainDepth: import("@kbn/config-schema").Type<number>;
}>;
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    eventDriven: import("@kbn/config-schema").ObjectType<{
        /**
         * When false, event-driven workflow execution is disabled: event-triggered runs
         * (triggeredBy not in manual/scheduled/alert) are skipped at execution time.
         */
        enabled: import("@kbn/config-schema").Type<boolean>;
        /**
         * When false, trigger events are not logged to the trigger-events data stream.
         */
        logEvents: import("@kbn/config-schema").Type<boolean>;
        /**
         * Maximum depth for event-triggered chains (any workflow in the chain).
         * Scheduling is skipped when depth exceeds this value.
         */
        maxChainDepth: import("@kbn/config-schema").Type<number>;
    }>;
    /**
     * Maximum depth of nested workflow execution (workflow calling workflow via workflow.execute step).
     */
    maxWorkflowDepth: import("@kbn/config-schema").Type<number>;
    logging: import("@kbn/config-schema").ObjectType<{
        console: import("@kbn/config-schema").Type<boolean>;
    }>;
    http: import("@kbn/config-schema").ObjectType<{
        allowedHosts: import("@kbn/config-schema").Type<string[]>;
    }>;
    maxResponseSize: import("@kbn/config-schema").Type<import("@kbn/config-schema").ByteSizeValue>;
    eviction: import("@kbn/config-schema").ObjectType<{
        /**
         * Minimum output payload size for a completed step to be eligible for eviction
         * from in-memory state after it has been flushed to Elasticsearch.
         * Payloads smaller than this threshold stay in memory to avoid ES round-trip latency.
         * Set to "0b" to evict all completed step outputs, or a very large value to disable eviction.
         */
        minPayloadSize: import("@kbn/config-schema").Type<import("@kbn/config-schema").ByteSizeValue>;
    }>;
    collectQueueMetrics: import("@kbn/config-schema").Type<boolean>;
}>;
export type EventTriggersConfig = TypeOf<typeof EventTriggersConfigSchema>;
export type WorkflowsExecutionEngineConfig = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<WorkflowsExecutionEngineConfig>;
export {};
