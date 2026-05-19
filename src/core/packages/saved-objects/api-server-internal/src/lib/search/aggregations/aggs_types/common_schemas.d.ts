export declare const sortOrderSchema: import("@kbn/config-schema").Type<"asc" | "desc" | "_doc">;
export declare const sortSchema: import("@kbn/config-schema").Type<string | Record<string, "asc" | "desc" | "_doc" | Readonly<{
    mode?: "min" | "max" | "avg" | "sum" | "median" | undefined;
    order?: "asc" | "desc" | "_doc" | undefined;
    missing?: string | number | boolean | undefined;
} & {}>> | (string | Record<string, "asc" | "desc" | "_doc" | Readonly<{
    mode?: "min" | "max" | "avg" | "sum" | "median" | undefined;
    order?: "asc" | "desc" | "_doc" | undefined;
    missing?: string | number | boolean | undefined;
} & {}>>)[]>;
