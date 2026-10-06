export declare const sortOrderSchema: import("@kbn/config-schema").Type<"_doc" | "asc" | "desc">;
export declare const sortSchema: import("@kbn/config-schema").Type<string | (string | Record<string, "_doc" | "asc" | "desc" | Readonly<{
    missing?: string | number | boolean | undefined;
    mode?: "avg" | "max" | "median" | "min" | "sum" | undefined;
    order?: "_doc" | "asc" | "desc" | undefined;
} & {}>>)[] | Record<string, "_doc" | "asc" | "desc" | Readonly<{
    missing?: string | number | boolean | undefined;
    mode?: "avg" | "max" | "median" | "min" | "sum" | undefined;
    order?: "_doc" | "asc" | "desc" | undefined;
} & {}>>>;
