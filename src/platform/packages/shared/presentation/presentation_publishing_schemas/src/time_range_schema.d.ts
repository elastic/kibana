export declare const serializedTimeRangeSchema: import("@kbn/config-schema").ObjectType<{
    time_range: import("@kbn/config-schema").Type<Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
}>;
