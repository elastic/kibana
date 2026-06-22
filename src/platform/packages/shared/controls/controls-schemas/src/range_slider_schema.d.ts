export declare const rangeValueSchema: import("@kbn/config-schema").Type<string[]>;
export declare const rangeSliderControlSchema: import("@kbn/config-schema").ObjectType<{
    value: import("@kbn/config-schema").Type<string[] | undefined>;
    step: import("@kbn/config-schema").Type<number>;
    data_view_id: import("@kbn/config-schema").Type<string>;
    field_name: import("@kbn/config-schema").Type<string>;
    use_global_filters: import("@kbn/config-schema").Type<boolean>;
    ignore_validations: import("@kbn/config-schema").Type<boolean>;
    title: import("@kbn/config-schema").Type<string | undefined>;
}>;
