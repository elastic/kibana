import type { TypeOf } from '@kbn/config-schema';
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    new_version: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
    }>;
    url_expiration: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        duration: import("@kbn/config-schema").Type<import("moment").Duration>;
        check_interval: import("@kbn/config-schema").Type<import("moment").Duration>;
        url_limit: import("@kbn/config-schema").Type<number>;
    }>;
}>;
export type ConfigSchema = TypeOf<typeof configSchema>;
