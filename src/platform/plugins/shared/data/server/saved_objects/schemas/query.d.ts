export declare const SCHEMA_QUERY_BASE: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string>;
    query: import("@kbn/config-schema").ObjectType<{
        language: import("@kbn/config-schema").Type<string>;
        query: import("@kbn/config-schema").Type<string | Readonly<{} & {}>>;
    }>;
    filters: import("@kbn/config-schema").Type<Readonly<{} & {}>[] | undefined>;
    timefilter: import("@kbn/config-schema").Type<Readonly<{
        refreshInterval?: Readonly<{} & {
            value: number;
            pause: boolean;
        }> | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
}>;
export declare const SCHEMA_QUERY_V8_8_0: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string>;
    query: import("@kbn/config-schema").ObjectType<{
        language: import("@kbn/config-schema").Type<string>;
        query: import("@kbn/config-schema").Type<string | Readonly<{} & {}>>;
    }>;
    filters: import("@kbn/config-schema").Type<Readonly<{} & {}>[] | undefined>;
    timefilter: import("@kbn/config-schema").Type<Readonly<{
        refreshInterval?: Readonly<{} & {
            value: number;
            pause: boolean;
        }> | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
}>;
export declare const SCHEMA_QUERY_MODEL_VERSION_1: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string>;
    query: import("@kbn/config-schema").ObjectType<{
        language: import("@kbn/config-schema").Type<string>;
        query: import("@kbn/config-schema").Type<string | Readonly<{} & {}>>;
    }>;
    filters: import("@kbn/config-schema").Type<Readonly<{} & {}>[] | undefined>;
    timefilter: import("@kbn/config-schema").Type<Readonly<{
        refreshInterval?: Readonly<{} & {
            value: number;
            pause: boolean;
        }> | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
}>;
export declare const SCHEMA_QUERY_MODEL_VERSION_2: import("@kbn/config-schema").ObjectType<Omit<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string>;
    query: import("@kbn/config-schema").ObjectType<{
        language: import("@kbn/config-schema").Type<string>;
        query: import("@kbn/config-schema").Type<string | Readonly<{} & {}>>;
    }>;
    filters: import("@kbn/config-schema").Type<Readonly<{} & {}>[] | undefined>;
    timefilter: import("@kbn/config-schema").Type<Readonly<{
        refreshInterval?: Readonly<{} & {
            value: number;
            pause: boolean;
        }> | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
}, "filters" | "timefilter" | "titleKeyword"> & {
    filters: import("@kbn/config-schema").Type<Readonly<{} & {}>[] | null | undefined>;
    timefilter: import("@kbn/config-schema").Type<Readonly<{
        refreshInterval?: Readonly<{} & {
            value: number;
            pause: boolean;
        }> | undefined;
    } & {
        from: string;
        to: string;
    }> | null | undefined>;
    titleKeyword: import("@kbn/config-schema").Type<string>;
}>;
