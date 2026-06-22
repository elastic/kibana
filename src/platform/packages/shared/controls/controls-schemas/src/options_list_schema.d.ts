export declare const optionsListDisplaySettingsSchema: import("@kbn/config-schema").ObjectType<{
    placeholder: import("@kbn/config-schema").Type<string | undefined>;
    hide_action_bar: import("@kbn/config-schema").Type<boolean | undefined>;
    hide_exclude: import("@kbn/config-schema").Type<boolean | undefined>;
    hide_exists: import("@kbn/config-schema").Type<boolean | undefined>;
    hide_sort: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const optionsListSearchTechniqueSchema: import("@kbn/config-schema").Type<"prefix" | "wildcard" | "exact">;
export declare const optionsListSortSchema: import("@kbn/config-schema").ObjectType<{
    by: import("@kbn/config-schema").Type<"_count" | "_key">;
    direction: import("@kbn/config-schema").Type<"asc" | "desc">;
}>;
export declare const optionsListSelectionSchema: import("@kbn/config-schema").Type<string | number>;
export declare const optionsListDSLControlSchema: import("@kbn/config-schema").ObjectType<{
    exclude: import("@kbn/config-schema").Type<boolean>;
    exists_selected: import("@kbn/config-schema").Type<boolean>;
    run_past_timeout: import("@kbn/config-schema").Type<boolean>;
    search_technique: import("@kbn/config-schema").Type<"prefix" | "wildcard" | "exact">;
    selected_options: import("@kbn/config-schema").Type<(string | number)[]>;
    single_select: import("@kbn/config-schema").Type<boolean>;
    sort: import("@kbn/config-schema").ObjectType<{
        by: import("@kbn/config-schema").Type<"_count" | "_key">;
        direction: import("@kbn/config-schema").Type<"asc" | "desc">;
    }>;
    data_view_id: import("@kbn/config-schema").Type<string>;
    field_name: import("@kbn/config-schema").Type<string>;
    use_global_filters: import("@kbn/config-schema").Type<boolean>;
    ignore_validations: import("@kbn/config-schema").Type<boolean>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    display_settings: import("@kbn/config-schema").Type<Readonly<{
        placeholder?: string | undefined;
        hide_action_bar?: boolean | undefined;
        hide_exclude?: boolean | undefined;
        hide_exists?: boolean | undefined;
        hide_sort?: boolean | undefined;
    } & {}> | undefined>;
}>;
export declare const optionsListESQLControlSchema: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
    control_type: import("@kbn/config-schema").Type<"STATIC_VALUES">;
    available_options: import("@kbn/config-schema").Type<string[]>;
    selected_options: import("@kbn/config-schema").Type<string[]>;
    single_select: import("@kbn/config-schema").Type<boolean>;
    variable_name: import("@kbn/config-schema").Type<string>;
    variable_type: import("@kbn/config-schema").Type<"functions" | "values" | "fields" | "time_literal" | "multi_values">;
    display_settings: import("@kbn/config-schema").Type<Readonly<{
        placeholder?: string | undefined;
        hide_action_bar?: boolean | undefined;
        hide_exclude?: boolean | undefined;
        hide_exists?: boolean | undefined;
        hide_sort?: boolean | undefined;
    } & {}> | undefined>;
    title: import("@kbn/config-schema").Type<string | undefined>;
} | {
    control_type: import("@kbn/config-schema").Type<"VALUES_FROM_QUERY">;
    esql_query: import("@kbn/config-schema").Type<string>;
    selected_options: import("@kbn/config-schema").Type<string[]>;
    single_select: import("@kbn/config-schema").Type<boolean>;
    variable_name: import("@kbn/config-schema").Type<string>;
    variable_type: import("@kbn/config-schema").Type<"functions" | "values" | "fields" | "time_literal" | "multi_values">;
    display_settings: import("@kbn/config-schema").Type<Readonly<{
        placeholder?: string | undefined;
        hide_action_bar?: boolean | undefined;
        hide_exclude?: boolean | undefined;
        hide_exists?: boolean | undefined;
        hide_sort?: boolean | undefined;
    } & {}> | undefined>;
    title: import("@kbn/config-schema").Type<string | undefined>;
}>>;
