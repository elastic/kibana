export declare const runtimeFieldBaseSchema: import("@kbn/config-schema").ObjectType<Omit<{
    format: import("@kbn/config-schema").Type<Readonly<{
        params?: any;
    } & {
        type: string;
    }> | undefined>;
    custom_label: import("@kbn/config-schema").Type<string | undefined>;
    custom_description: import("@kbn/config-schema").Type<string | undefined>;
}, "type"> & {
    type: import("@kbn/config-schema").Type<"boolean" | "keyword" | "date" | "ip" | "geo_point" | "double" | "long">;
}>;
export declare const primitiveRuntimeFieldSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    format: import("@kbn/config-schema").Type<Readonly<{
        params?: any;
    } & {
        type: string;
    }> | undefined>;
    custom_label: import("@kbn/config-schema").Type<string | undefined>;
    custom_description: import("@kbn/config-schema").Type<string | undefined>;
}, "type"> & {
    type: import("@kbn/config-schema").Type<"boolean" | "keyword" | "date" | "ip" | "geo_point" | "double" | "long">;
}, "script"> & {
    script: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const compositeRuntimeFieldSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"composite">;
    fields: import("@kbn/config-schema").Type<Record<string, Readonly<{
        format?: Readonly<{
            params?: any;
        } & {
            type: string;
        }> | undefined;
        custom_label?: string | undefined;
        custom_description?: string | undefined;
    } & {
        type: "boolean" | "keyword" | "date" | "ip" | "geo_point" | "double" | "long";
    }>>>;
    script: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const runtimeFieldSchema: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<Omit<{
    format: import("@kbn/config-schema").Type<Readonly<{
        params?: any;
    } & {
        type: string;
    }> | undefined>;
    custom_label: import("@kbn/config-schema").Type<string | undefined>;
    custom_description: import("@kbn/config-schema").Type<string | undefined>;
}, "type"> & {
    type: import("@kbn/config-schema").Type<"boolean" | "keyword" | "date" | "ip" | "geo_point" | "double" | "long">;
}, "script"> & {
    script: import("@kbn/config-schema").Type<string | undefined>;
}) | {
    type: import("@kbn/config-schema").Type<"composite">;
    fields: import("@kbn/config-schema").Type<Record<string, Readonly<{
        format?: Readonly<{
            params?: any;
        } & {
            type: string;
        }> | undefined;
        custom_label?: string | undefined;
        custom_description?: string | undefined;
    } & {
        type: "boolean" | "keyword" | "date" | "ip" | "geo_point" | "double" | "long";
    }>>>;
    script: import("@kbn/config-schema").Type<string | undefined>;
}>>;
