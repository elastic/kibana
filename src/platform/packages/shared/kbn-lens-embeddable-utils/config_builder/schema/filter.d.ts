export declare const filterSchema: import("@kbn/config-schema").ObjectType<{
    language: import("@kbn/config-schema").Type<"lucene" | "kql">;
    expression: import("@kbn/config-schema").Type<string>;
}>;
export declare const filterWithLabelSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * Filter query
     */
    filter: import("@kbn/config-schema").ObjectType<{
        language: import("@kbn/config-schema").Type<"lucene" | "kql">;
        expression: import("@kbn/config-schema").Type<string>;
    }>;
    /**
     * Label for the filter
     */
    label: import("@kbn/config-schema").Type<string | undefined>;
}>;
export type LensApiFilterType = typeof filterSchema.type;
