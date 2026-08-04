export declare const legacySearchRequestParamsSchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number | undefined>;
    per_page: import("@kbn/config-schema").Type<number | undefined>;
    query: import("@kbn/config-schema").Type<string | undefined>;
    tags: import("@kbn/config-schema").Type<string | string[] | undefined>;
    excluded_tags: import("@kbn/config-schema").Type<string | string[] | undefined>;
    tag_names: import("@kbn/config-schema").Type<string | string[] | undefined>;
    excluded_tag_names: import("@kbn/config-schema").Type<string | string[] | undefined>;
}>;
export declare const legacySearchResponseBodySchema: import("@kbn/config-schema").ObjectType<{
    dashboards: import("@kbn/config-schema").Type<Readonly<{} & {
        meta: Readonly<{
            version?: string | undefined;
            managed?: boolean | undefined;
            created_at?: string | undefined;
            created_by?: string | undefined;
            updated_at?: string | undefined;
            updated_by?: string | undefined;
            owner?: string | undefined;
        } & {}>;
        id: string;
        data: Readonly<{
            description?: string | undefined;
            time_range?: Readonly<{
                mode?: "absolute" | "relative" | undefined;
            } & {
                from: string;
                to: string;
            }> | undefined;
            tags?: string[] | undefined;
            access_control?: Readonly<{
                access_mode?: "default" | "write_restricted" | undefined;
            } & {}> | undefined;
        } & {
            title: string;
        }>;
    }>[]>;
    page: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
}>;
export declare const searchResponseBodySchema: import("@kbn/config-schema").ObjectType<{
    data: import("@kbn/config-schema").Type<Readonly<{} & {
        meta: Readonly<{
            version?: string | undefined;
            managed?: boolean | undefined;
            created_at?: string | undefined;
            created_by?: string | undefined;
            updated_at?: string | undefined;
            updated_by?: string | undefined;
            owner?: string | undefined;
        } & {}>;
        id: string;
        data: Readonly<{
            description?: string | undefined;
            time_range?: Readonly<{
                mode?: "absolute" | "relative" | undefined;
            } & {
                from: string;
                to: string;
            }> | undefined;
            tags?: string[] | undefined;
            access_control?: Readonly<{
                access_mode?: "default" | "write_restricted" | undefined;
            } & {}> | undefined;
        } & {
            title: string;
        }>;
    }>[]>;
    meta: import("@kbn/config-schema").ObjectType<{
        page: import("@kbn/config-schema").Type<number>;
        per_page: import("@kbn/config-schema").Type<number>;
        total: import("@kbn/config-schema").Type<number>;
    }>;
}>;
