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
    direction: import("@kbn/config-schema").Type<"desc" | "asc">;
}>;
export declare const optionsListSelectionSchema: import("@kbn/config-schema").Type<string | number>;
export declare const optionsListDSLControlSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<{
    title: import("@kbn/config-schema").Type<string | undefined>;
}, "data_view_id" | "field_name" | "use_global_filters" | "ignore_validations"> & {
    data_view_id: import("@kbn/config-schema").Type<string>;
    field_name: import("@kbn/config-schema").Type<string>;
    use_global_filters: import("@kbn/config-schema").Type<boolean | undefined>;
    ignore_validations: import("@kbn/config-schema").Type<boolean | undefined>;
}, "display_settings" | "single_select"> & {
    display_settings: import("@kbn/config-schema").Type<Readonly<{
        placeholder?: string | undefined;
        hide_action_bar?: boolean | undefined;
        hide_exclude?: boolean | undefined;
        hide_exists?: boolean | undefined;
        hide_sort?: boolean | undefined;
    } & {}> | undefined>;
    single_select: import("@kbn/config-schema").Type<boolean | undefined>;
}, "sort" | "exclude" | "exists_selected" | "run_past_timeout" | "search_technique" | "selected_options"> & {
    sort: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "desc" | "asc";
        by: "_count" | "_key";
    }> | undefined>;
    exclude: import("@kbn/config-schema").Type<boolean | undefined>;
    exists_selected: import("@kbn/config-schema").Type<boolean | undefined>;
    run_past_timeout: import("@kbn/config-schema").Type<boolean | undefined>;
    search_technique: import("@kbn/config-schema").Type<"prefix" | "wildcard" | "exact" | undefined>;
    selected_options: import("@kbn/config-schema").Type<(string | number)[] | undefined>;
}>;
export declare const optionsListESQLControlSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    title: import("@kbn/config-schema").Type<string | undefined>;
}, "display_settings" | "single_select"> & {
    display_settings: import("@kbn/config-schema").Type<Readonly<{
        placeholder?: string | undefined;
        hide_action_bar?: boolean | undefined;
        hide_exclude?: boolean | undefined;
        hide_exists?: boolean | undefined;
        hide_sort?: boolean | undefined;
    } & {}> | undefined>;
    single_select: import("@kbn/config-schema").Type<boolean | undefined>;
}, "selected_options" | "variable_name" | "variable_type" | "esql_query" | "control_type" | "available_options"> & {
    selected_options: import("@kbn/config-schema").Type<string[]>;
    variable_name: import("@kbn/config-schema").Type<string>;
    variable_type: import("@kbn/config-schema").Type<"values" | "fields" | "functions" | "time_literal" | "multi_values">;
    esql_query: import("@kbn/config-schema").Type<string>;
    control_type: import("@kbn/config-schema").Type<"STATIC_VALUES" | "VALUES_FROM_QUERY">;
    available_options: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
