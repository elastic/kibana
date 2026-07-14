export declare const querySchema: import("@kbn/config-schema").ObjectType<{
    query: import("@kbn/config-schema").Type<string | Record<string, any>>;
    language: import("@kbn/config-schema").Type<string>;
}>;
export declare const aggregateQuerySchema: import("@kbn/config-schema").ObjectType<{
    esql: import("@kbn/config-schema").Type<string>;
}>;
