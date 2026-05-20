import type { TypeOf } from '@kbn/config-schema';
export declare const autoCompleteEntitiesValidationConfig: {
    query: import("@kbn/config-schema").ObjectType<{
        indices: import("@kbn/config-schema").Type<boolean | undefined>;
        fields: import("@kbn/config-schema").Type<boolean | undefined>;
        templates: import("@kbn/config-schema").Type<boolean | undefined>;
        dataStreams: import("@kbn/config-schema").Type<boolean | undefined>;
        /**
         * Comma separated list of indices for mappings retrieval.
         */
        fieldsIndices: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export type SettingsToRetrieve = TypeOf<typeof autoCompleteEntitiesValidationConfig.query>;
