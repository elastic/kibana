export declare const searchRequestParamsSchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number | undefined>;
    per_page: import("@kbn/config-schema").Type<number | undefined>;
    query: import("@kbn/config-schema").Type<string | undefined>;
    tags: import("@kbn/config-schema").Type<string | string[] | undefined>;
    excluded_tags: import("@kbn/config-schema").Type<string | string[] | undefined>;
}>;
export declare const searchResponseBodySchema: import("@kbn/config-schema").ObjectType<{
    dashboards: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        data: Readonly<{
            description?: string | undefined;
            tags?: string[] | undefined;
            time_range?: Readonly<{
                mode?: "relative" | "absolute" | undefined;
            } & {
                from: string;
                to: string;
            }> | undefined;
            access_control?: Readonly<{
                access_mode?: "default" | "write_restricted" | undefined;
            } & {}> | undefined;
        } & {
            title: string;
        }>;
        meta: Readonly<{
            version?: string | undefined;
            updated_at?: string | undefined;
            updated_by?: string | undefined;
            created_at?: string | undefined;
            created_by?: string | undefined;
            managed?: boolean | undefined;
            owner?: string | undefined;
        } & {}>;
    }>[]>;
    total: import("@kbn/config-schema").Type<number>;
    page: import("@kbn/config-schema").Type<number>;
}>;
