import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    usageCounters: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        retryCount: import("@kbn/config-schema").Type<number>;
        bufferDuration: import("@kbn/config-schema").Type<import("moment").Duration>;
    }>;
    uiCounters: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        debug: import("@kbn/config-schema").Type<boolean>;
    }>;
    maximumWaitTimeForAllCollectorsInS: import("@kbn/config-schema").Type<number>;
    maxCollectorConcurrency: import("@kbn/config-schema").Type<number>;
}>;
export type ConfigType = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<ConfigType>;
