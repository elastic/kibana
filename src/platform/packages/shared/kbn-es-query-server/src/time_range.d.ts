export declare const timeRangeSchema: import("@kbn/config-schema").ObjectType<{
    from: import("@kbn/config-schema").Type<string>;
    to: import("@kbn/config-schema").Type<string>;
    mode: import("@kbn/config-schema").Type<"relative" | "absolute" | undefined>;
}>;
export declare const absoluteTimeRangeSchema: import("@kbn/config-schema").ObjectType<Omit<{
    from: import("@kbn/config-schema").Type<string>;
    to: import("@kbn/config-schema").Type<string>;
    mode: import("@kbn/config-schema").Type<"relative" | "absolute" | undefined>;
}, "mode"> & {
    mode: import("@kbn/config-schema").Type<"absolute">;
}>;
export declare const relativeTimeRangeSchema: import("@kbn/config-schema").ObjectType<Omit<{
    from: import("@kbn/config-schema").Type<string>;
    to: import("@kbn/config-schema").Type<string>;
    mode: import("@kbn/config-schema").Type<"relative" | "absolute" | undefined>;
}, "mode"> & {
    mode: import("@kbn/config-schema").Type<"relative">;
}>;
