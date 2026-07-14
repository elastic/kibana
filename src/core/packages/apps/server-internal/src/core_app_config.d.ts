import { type TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
/**
 * Validation schema for Core App config.
 * @public
 */
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    allowDynamicConfigOverrides: import("@kbn/config-schema").Type<boolean>;
    /**
     * Do not register unused bundle routes if the CDN configuration is enabled.
     */
    skipBundleRoutesIfCdnEnabled: import("@kbn/config-schema").Type<boolean>;
}>;
export type CoreAppConfigType = TypeOf<typeof configSchema>;
export declare const CoreAppPath = "coreApp";
export declare const config: ServiceConfigDescriptor<CoreAppConfigType>;
/**
 * Wrapper of config schema.
 * @internal
 */
export declare class CoreAppConfig implements CoreAppConfigType {
    /**
     * @internal
     * When true, the HTTP API to dynamically extend the configuration is registered.
     *
     * @remarks
     * You should enable this at your own risk: Settings opted-in to being dynamically
     * configurable can be changed at any given point, potentially leading to unexpected behaviours.
     * This feature is mostly intended for testing purposes.
     */
    readonly allowDynamicConfigOverrides: boolean;
    /**
     * @internal
     * When true, the registration of the bundle routes are skipped if CDN is enabled.
     */
    readonly skipBundleRoutesIfCdnEnabled: boolean;
    constructor(rawConfig: CoreAppConfig);
}
