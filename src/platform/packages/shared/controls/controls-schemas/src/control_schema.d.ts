export declare const controlTitleSchema: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const dataControlSchema: import("@kbn/config-schema").ObjectType<{
    data_view_id: import("@kbn/config-schema").Type<string>;
    field_name: import("@kbn/config-schema").Type<string>;
    use_global_filters: import("@kbn/config-schema").Type<boolean>;
    ignore_validations: import("@kbn/config-schema").Type<boolean>;
    title: import("@kbn/config-schema").Type<string | undefined>;
}>;
