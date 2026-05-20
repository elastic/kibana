import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';
import type { TypeOf } from '@kbn/config-schema';
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    enableUiSettingsValidations: import("@kbn/config-schema").Type<boolean>;
    experimental: import("@kbn/config-schema").Type<Readonly<{
        ruleFormV2Enabled?: boolean | undefined;
        enabledProfiles?: string[] | undefined;
    } & {}> | undefined>;
}>;
export type ConfigSchema = TypeOf<typeof configSchema>;
export type ExperimentalFeatures = NonNullable<ConfigSchema['experimental']>;
export declare const config: PluginConfigDescriptor<ConfigSchema>;
