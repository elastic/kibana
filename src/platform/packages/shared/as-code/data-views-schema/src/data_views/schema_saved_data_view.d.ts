export declare const savedFieldSettingsSchema: import("@kbn/config-schema").Type<Readonly<{
    format?: Readonly<{
        params?: any;
    } & {
        type: string;
    }> | undefined;
    custom_label?: string | undefined;
    custom_description?: string | undefined;
    popularity?: number | undefined;
} & {}> | Readonly<{
    script?: string | undefined;
    format?: Readonly<{
        params?: any;
    } & {
        type: string;
    }> | undefined;
    custom_label?: string | undefined;
    custom_description?: string | undefined;
    popularity?: number | undefined;
} & {
    type: "boolean" | "keyword" | "date" | "ip" | "geo_point" | "double" | "long";
}> | Readonly<{
    script?: string | undefined;
} & {
    type: "composite";
    fields: Record<string, Readonly<{
        format?: Readonly<{
            params?: any;
        } & {
            type: string;
        }> | undefined;
        custom_label?: string | undefined;
        custom_description?: string | undefined;
        popularity?: number | undefined;
    } & {
        type: "boolean" | "keyword" | "date" | "ip" | "geo_point" | "double" | "long";
    }>>;
}>>;
export declare const savedDataViewSpecSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    name: import("@kbn/config-schema").Type<string | undefined>;
    allow_hidden_indices: import("@kbn/config-schema").Type<boolean | undefined>;
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
        popularity?: number | undefined;
    } & {}> | Readonly<{
        script?: string | undefined;
        format?: Readonly<{
            params?: any;
        } & {
            type: string;
        }> | undefined;
        custom_label?: string | undefined;
        custom_description?: string | undefined;
        popularity?: number | undefined;
    } & {
        type: "boolean" | "keyword" | "date" | "ip" | "geo_point" | "double" | "long";
    }> | Readonly<{
        script?: string | undefined;
    } & {
        type: "composite";
        fields: Record<string, Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "keyword" | "date" | "ip" | "geo_point" | "double" | "long";
        }>>;
    }>> | undefined>;
}>;
