export declare const rangeValueSchema: import("@kbn/config-schema").Type<string[]>;
export declare const rangeSliderControlSchema: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
    value: import("@kbn/config-schema").Type<string[] | undefined>;
    step: import("@kbn/config-schema").Type<number>;
    values_source: import("@kbn/config-schema").Type<import("@kbn/controls-constants").ControlValuesSource.ESQL>;
    esql_query: import("@kbn/config-schema").Type<string>;
    use_global_filters: import("@kbn/config-schema").Type<boolean>;
    ignore_validations: import("@kbn/config-schema").Type<boolean>;
    title: import("@kbn/config-schema").Type<string | undefined>;
} | {
    value: import("@kbn/config-schema").Type<string[] | undefined>;
    step: import("@kbn/config-schema").Type<number>;
    values_source: import("@kbn/config-schema").Type<import("@kbn/controls-constants").ControlValuesSource.FIELD>;
    data_view_id: import("@kbn/config-schema").Type<string>;
    field_name: import("@kbn/config-schema").Type<string>;
    use_global_filters: import("@kbn/config-schema").Type<boolean>;
    ignore_validations: import("@kbn/config-schema").Type<boolean>;
    title: import("@kbn/config-schema").Type<string | undefined>;
}>>;
