export declare const rangeValueSchema: import("@kbn/config-schema").Type<string[]>;
export declare const rangeSliderControlSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    title: import("@kbn/config-schema").Type<string | undefined>;
}, "data_view_id" | "field_name" | "use_global_filters" | "ignore_validations"> & {
    data_view_id: import("@kbn/config-schema").Type<string>;
    field_name: import("@kbn/config-schema").Type<string>;
    use_global_filters: import("@kbn/config-schema").Type<boolean | undefined>;
    ignore_validations: import("@kbn/config-schema").Type<boolean | undefined>;
}, "step" | "value"> & {
    step: import("@kbn/config-schema").Type<number | undefined>;
    value: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
