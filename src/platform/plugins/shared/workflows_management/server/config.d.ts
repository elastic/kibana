import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    logging: import("@kbn/config-schema").ObjectType<{
        console: import("@kbn/config-schema").Type<boolean>;
    }>;
    /**
     * Whether the plugin is available in the current offering pricing model.
     * This is used to turn off workflows management server features via config in specific serverless tiers,
     * without completely disabling the plugin.
     */
    available: import("@kbn/config-schema").Type<boolean>;
    /**
     * Global workflow executions list (`/app/workflows/executions`). Not exposed in Advanced Settings;
     * enable via `workflowsManagement.globalExecutionsView.enabled` in `kibana.yml`.
     */
    globalExecutionsView: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
    }>;
}>;
export type WorkflowsManagementConfig = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<WorkflowsManagementConfig>;
export {};
