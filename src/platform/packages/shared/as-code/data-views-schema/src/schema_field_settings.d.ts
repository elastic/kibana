export declare const fieldSettingsBaseSchema: import("@kbn/config-schema").ObjectType<{
    format: import("@kbn/config-schema").Type<Readonly<{
        params?: any;
    } & {
        type: string;
    }> | undefined>;
    custom_label: import("@kbn/config-schema").Type<string | undefined>;
    custom_description: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const fieldSettingsWithPopularitySchema: import("@kbn/config-schema").ObjectType<Omit<{
    format: import("@kbn/config-schema").Type<Readonly<{
        params?: any;
    } & {
        type: string;
    }> | undefined>;
    custom_label: import("@kbn/config-schema").Type<string | undefined>;
    custom_description: import("@kbn/config-schema").Type<string | undefined>;
}, "popularity"> & {
    popularity: import("@kbn/config-schema").Type<number | undefined>;
}>;
