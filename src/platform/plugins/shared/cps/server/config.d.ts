import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    cpsEnabled: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
}>;
type ConfigType = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<ConfigType>;
export type CPSConfig = TypeOf<typeof configSchema>;
export {};
