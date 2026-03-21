import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    /**
     * When false, event-driven workflow execution is disabled: event-triggered runs
     * (triggeredBy not in manual/scheduled/alert) are skipped at execution time.
     */
    eventDriven: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        logEvents: import("@kbn/config-schema").Type<boolean>;
    }>;
    logging: import("@kbn/config-schema").ObjectType<{
        console: import("@kbn/config-schema").Type<boolean>;
    }>;
    http: import("@kbn/config-schema").ObjectType<{
        allowedHosts: import("@kbn/config-schema").Type<string[]>;
    }>;
    maxResponseSize: import("@kbn/config-schema").Type<import("@kbn/config-schema").ByteSizeValue>;
    collectQueueMetrics: import("@kbn/config-schema").Type<boolean>;
}>;
export type WorkflowsExecutionEngineConfig = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<WorkflowsExecutionEngineConfig>;
export {};
