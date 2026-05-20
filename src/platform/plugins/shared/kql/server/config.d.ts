import type { TypeOf } from '@kbn/config-schema';
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    autocomplete: import("@kbn/config-schema").ObjectType<{
        querySuggestions: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").Type<boolean>;
        }>;
        valueSuggestions: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").Type<boolean>;
            tiers: import("@kbn/config-schema").Type<string[]>;
            terminateAfter: import("@kbn/config-schema").Type<import("moment").Duration>;
            timeout: import("@kbn/config-schema").Type<import("moment").Duration>;
        }>;
    }>;
}>;
export type ConfigSchema = TypeOf<typeof configSchema>;
