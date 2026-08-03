export declare const asCodeSearchRequestSchema: import("@kbn/config-schema").ObjectType<{
    query: import("@kbn/config-schema").Type<string | undefined>;
    tags: import("@kbn/config-schema").Type<string | string[] | undefined>;
    excluded_tags: import("@kbn/config-schema").Type<string | string[] | undefined>;
    tag_names: import("@kbn/config-schema").Type<string | string[] | undefined>;
    excluded_tag_names: import("@kbn/config-schema").Type<string | string[] | undefined>;
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
}>;
