import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    logging: import("@kbn/config-schema").ObjectType<{
        console: import("@kbn/config-schema").Type<boolean>;
    }>;
}>;
export type WorkflowsManagementConfig = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<WorkflowsManagementConfig>;
export {};
