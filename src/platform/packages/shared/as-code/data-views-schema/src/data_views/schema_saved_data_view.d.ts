export declare const savedFieldSettingsSchema: import("@kbn/config-schema").Type<Readonly<{
    format?: Readonly<{
        params?: any;
    } & {
        type: string;
    }> | undefined;
    popularity?: number | undefined;
    custom_label?: string | undefined;
    custom_description?: string | undefined;
} & {}> | Readonly<{
    script?: string | undefined;
    format?: Readonly<{
        params?: any;
    } & {
        type: string;
    }> | undefined;
    popularity?: number | undefined;
    custom_label?: string | undefined;
    custom_description?: string | undefined;
} & {
    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
        popularity?: number | undefined;
        custom_label?: string | undefined;
        custom_description?: string | undefined;
    } & {
        type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
        popularity?: number | undefined;
        custom_label?: string | undefined;
        custom_description?: string | undefined;
    } & {}> | Readonly<{
        script?: string | undefined;
        format?: Readonly<{
            params?: any;
        } & {
            type: string;
        }> | undefined;
        popularity?: number | undefined;
        custom_label?: string | undefined;
        custom_description?: string | undefined;
    } & {
        type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
            popularity?: number | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
        }>>;
    }>> | undefined>;
}>;
