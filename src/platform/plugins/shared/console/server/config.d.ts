import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
declare const schemaLatest: import("@kbn/config-schema").ObjectType<{
    ui: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        embeddedEnabled: import("@kbn/config-schema").Type<boolean>;
    }>;
    autocompleteDefinitions: import("@kbn/config-schema").ObjectType<{
        endpointsAvailability: import("@kbn/config-schema").Type<"serverless" | "stack">;
    }>;
}>;
export type ConsoleConfig = TypeOf<typeof schemaLatest>;
export declare const config: PluginConfigDescriptor<ConsoleConfig>;
export {};
