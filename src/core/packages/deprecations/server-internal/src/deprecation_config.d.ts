import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    skip_deprecated_settings: import("@kbn/config-schema").Type<string[]>;
    enable_http_debug_logs: import("@kbn/config-schema").Type<boolean>;
}>;
export type DeprecationConfigType = TypeOf<typeof configSchema>;
export declare const config: ServiceConfigDescriptor<DeprecationConfigType>;
export {};
