import { type TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
declare const coreConfigSchema: import("@kbn/config-schema").ObjectType<{
    lifecycle: import("@kbn/config-schema").ObjectType<{
        disablePreboot: import("@kbn/config-schema").Type<boolean>;
    }>;
    /**
     * If the config validation fails, this setting allows retrying it with `stripUnknownKeys: true`, which removes any
     * unknown config keys from the resulting validated config object.
     *
     * This is an escape hatch that should be used only
     * if necessary. The setting is expected to be false in the classic offering and during dev and CI times.
     * However, on Serverless, we'd like to set it to true to avoid bootlooping in case of any temporary misalignment
     * between our kibana-controller and the Kibana versions.
     */
    enableStripUnknownConfigWorkaround: import("@kbn/config-schema").Type<boolean>;
}>;
export type CoreConfigType = TypeOf<typeof coreConfigSchema>;
export declare const coreConfig: ServiceConfigDescriptor<CoreConfigType>;
export {};
