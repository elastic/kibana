export declare const fieldSettingsSchema: import("@kbn/config-schema").Type<Readonly<{
    format?: Readonly<{
        params?: any;
    } & {
        type: string;
    }> | undefined;
    custom_label?: string | undefined;
    custom_description?: string | undefined;
} & {}> | Readonly<{
    format?: Readonly<{
        params?: any;
    } & {
        type: string;
    }> | undefined;
    script?: string | undefined;
    custom_label?: string | undefined;
    custom_description?: string | undefined;
} & {
    type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point";
}> | Readonly<{
    script?: string | undefined;
} & {
    fields: Record<string, Readonly<{
        format?: Readonly<{
            params?: any;
        } & {
            type: string;
        }> | undefined;
        custom_label?: string | undefined;
        custom_description?: string | undefined;
    } & {
        type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point";
    }>>;
    type: "composite";
}>>;
export declare const dataViewReferenceSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"data_view_reference">;
    ref_id: import("@kbn/config-schema").Type<string>;
}>;
export declare const dataViewSpecSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"data_view_spec">;
    index_pattern: import("@kbn/config-schema").Type<string>;
    time_field: import("@kbn/config-schema").Type<string | undefined>;
    field_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
        format?: Readonly<{
            params?: any;
        } & {
            type: string;
        }> | undefined;
        custom_label?: string | undefined;
        custom_description?: string | undefined;
    } & {}> | Readonly<{
        format?: Readonly<{
            params?: any;
        } & {
            type: string;
        }> | undefined;
        script?: string | undefined;
        custom_label?: string | undefined;
        custom_description?: string | undefined;
    } & {
        type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point";
    }> | Readonly<{
        script?: string | undefined;
    } & {
        fields: Record<string, Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point";
        }>>;
        type: "composite";
    }>> | undefined>;
}>;
export declare const dataViewSchema: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
    type: import("@kbn/config-schema").Type<"data_view_reference">;
    ref_id: import("@kbn/config-schema").Type<string>;
} | {
    type: import("@kbn/config-schema").Type<"data_view_spec">;
    index_pattern: import("@kbn/config-schema").Type<string>;
    time_field: import("@kbn/config-schema").Type<string | undefined>;
    field_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
        format?: Readonly<{
            params?: any;
        } & {
            type: string;
        }> | undefined;
        custom_label?: string | undefined;
        custom_description?: string | undefined;
    } & {}> | Readonly<{
        format?: Readonly<{
            params?: any;
        } & {
            type: string;
        }> | undefined;
        script?: string | undefined;
        custom_label?: string | undefined;
        custom_description?: string | undefined;
    } & {
        type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point";
    }> | Readonly<{
        script?: string | undefined;
    } & {
        fields: Record<string, Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point";
        }>>;
        type: "composite";
    }>> | undefined>;
}>>;
