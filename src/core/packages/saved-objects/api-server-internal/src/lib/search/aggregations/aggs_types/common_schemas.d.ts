export declare const sortOrderSchema: import("@kbn/config-schema").Type<"desc" | "asc" | "_doc">;
export declare const sortSchema: import("@kbn/config-schema").Type<string | Record<string, "desc" | "asc" | "_doc" | Readonly<{
    mode?: "avg" | "max" | "median" | "min" | "sum" | undefined;
    order?: "desc" | "asc" | "_doc" | undefined;
    missing?: string | number | boolean | undefined;
} & {}>> | (string | Record<string, "desc" | "asc" | "_doc" | Readonly<{
    mode?: "avg" | "max" | "median" | "min" | "sum" | undefined;
    order?: "desc" | "asc" | "_doc" | undefined;
    missing?: string | number | boolean | undefined;
} & {}>>)[]>;
